import type { Point3DInches } from "@/core/geometry/pointTypes";
import { applyAssemblyPlacementRules } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { alignDesignReservationZone } from "@/engine/design-zones/designReservationZoneAlignment";
import type { DesignReservationZone } from "@/engine/design-zones/designReservationZoneTypes";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import type { SceneEntityMultiMoveDragState } from "../sceneDragTypes";
import type { SceneEntitySelectionRef, SceneSelection } from "../sceneSelectionTypes";
import { createSceneEntitySelectionKey, getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createSceneEntityDragActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<DesignSceneStore, "updateSceneEntityMultiDrag" | "finishSceneEntityMultiDrag" | "cancelSceneEntityMultiDrag"> {
  return {
    updateSceneEntityMultiDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "scene-entity-multi-move") {
        return;
      }

      const designScene = get().designScene;
      const leaderStartPosition = activeDrag.dragStartPositionsBySceneEntityKey[createSceneEntitySelectionKey(activeDrag.leaderSceneEntity)];

      if (leaderStartPosition === undefined) {
        return;
      }

      const leaderResult = createSceneEntityMultiMoveLeaderResult({
        activeDrag,
        pointerWorldInches,
        leaderStartPosition,
        designScene,
      });

      if (leaderResult === null) {
        return;
      }

      const deltaInches = {
        xInches: leaderResult.positionInches.xInches - leaderStartPosition.xInches,
        yInches: leaderResult.positionInches.yInches - leaderStartPosition.yInches,
        zInches: leaderResult.positionInches.zInches - leaderStartPosition.zInches,
      };
      const nextPositionsBySceneEntityKey = createMovedSceneEntityPositions({
        activeDrag,
        deltaInches,
      });

      set((state) => ({
        designScene: createDesignSceneWithSceneEntityPositions({
          designScene: state.designScene,
          positionsBySceneEntityKey: nextPositionsBySceneEntityKey,
        }),
        activeDrag: {
          ...activeDrag,
          latestValidPositionsBySceneEntityKey: leaderResult.isValid
            ? nextPositionsBySceneEntityKey
            : activeDrag.latestValidPositionsBySceneEntityKey,
        },
        assemblyPlacementFeedback: leaderResult.assemblyPlacementFeedback,
        activeObjectAlignmentGuides: leaderResult.alignmentGuides,
      }));
    },

    finishSceneEntityMultiDrag() {
      const activeDrag = get().activeDrag;
      const placementFeedback = get().assemblyPlacementFeedback;

      if (activeDrag?.kind !== "scene-entity-multi-move") {
        return;
      }

      recordDesignSceneHistoryEntry({
        get,
        set,
        label: "Move selected scene entities",
        designScene: createDesignSceneWithSceneEntityPositions({
          designScene: get().designScene,
          positionsBySceneEntityKey: activeDrag.dragStartPositionsBySceneEntityKey,
        }),
      });

      if (placementFeedback?.isValid === false) {
        set((state) => ({
          designScene: createDesignSceneWithSceneEntityPositions({
            designScene: state.designScene,
            positionsBySceneEntityKey: activeDrag.latestValidPositionsBySceneEntityKey,
          }),
          activeDrag: null,
          assemblyPlacementFeedback: null,
          activeObjectAlignmentGuides: [],
        }));
        return;
      }

      set({ activeDrag: null, assemblyPlacementFeedback: null, activeObjectAlignmentGuides: [] });
    },

    cancelSceneEntityMultiDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "scene-entity-multi-move") {
        return;
      }

      set((state) => ({
        designScene: createDesignSceneWithSceneEntityPositions({
          designScene: state.designScene,
          positionsBySceneEntityKey: activeDrag.dragStartPositionsBySceneEntityKey,
        }),
        activeDrag: null,
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },
  };
}

export function getSelectedSceneEntitiesForMultiDrag(args: {
  activeSelection: SceneSelection | null;
  leaderSceneEntity: SceneEntitySelectionRef;
  placedAssemblies: readonly PlacedAssembly[];
  designReservationZones: readonly DesignReservationZone[];
}): readonly SceneEntitySelectionRef[] {
  const selectedSceneEntities = getSceneEntityRefsFromSelection(args.activeSelection);
  const leaderKey = createSceneEntitySelectionKey(args.leaderSceneEntity);

  if (!selectedSceneEntities.some((sceneEntity) => createSceneEntitySelectionKey(sceneEntity) === leaderKey)) {
    return [args.leaderSceneEntity];
  }

  const existingAssemblyIds = new Set(args.placedAssemblies.map((assembly) => assembly.id));
  const existingZoneIds = new Set(args.designReservationZones.map((zone) => zone.id));
  const existingSceneEntities = selectedSceneEntities.filter((sceneEntity) => (
    sceneEntity.entityKind === "placed-assembly"
      ? existingAssemblyIds.has(sceneEntity.entityId)
      : existingZoneIds.has(sceneEntity.entityId)
  ));

  return existingSceneEntities.length === 0 ? [args.leaderSceneEntity] : existingSceneEntities;
}

export function createSceneEntityMultiMoveDragState(args: {
  leaderSceneEntity: SceneEntitySelectionRef;
  sceneEntities: readonly SceneEntitySelectionRef[];
  pointerWorldInches: Point3DInches;
  designScene: DesignScene;
  sceneViewMode: SceneEntityMultiMoveDragState["sceneViewMode"];
  elevationMoveFrame?: SceneEntityMultiMoveDragState["elevationMoveFrame"];
}): SceneEntityMultiMoveDragState {
  const dragStartPositionsBySceneEntityKey = Object.fromEntries(
    args.sceneEntities.map((sceneEntity) => [
      createSceneEntitySelectionKey(sceneEntity),
      getSceneEntityPosition(args.designScene, sceneEntity) ?? args.pointerWorldInches,
    ]),
  );

  return {
    kind: "scene-entity-multi-move",
    leaderSceneEntity: args.leaderSceneEntity,
    sceneEntities: args.sceneEntities,
    dragStartPointerWorldInches: args.pointerWorldInches,
    dragStartPositionsBySceneEntityKey,
    latestValidPositionsBySceneEntityKey: dragStartPositionsBySceneEntityKey,
    sceneViewMode: args.sceneViewMode,
    elevationMoveFrame: args.elevationMoveFrame,
  };
}

function createSceneEntityMultiMoveLeaderResult(args: {
  activeDrag: SceneEntityMultiMoveDragState;
  pointerWorldInches: Point3DInches;
  leaderStartPosition: Point3DInches;
  designScene: DesignScene;
}): {
  positionInches: Point3DInches;
  isValid: boolean;
  assemblyPlacementFeedback: DesignSceneStore["assemblyPlacementFeedback"];
  alignmentGuides: DesignSceneStore["activeObjectAlignmentGuides"];
} | null {
  if (args.activeDrag.leaderSceneEntity.entityKind === "placed-assembly") {
    const leaderAssembly = args.designScene.placedAssemblies.find((assembly) => assembly.id === args.activeDrag.leaderSceneEntity.entityId);

    if (leaderAssembly === undefined) {
      return null;
    }

    const proposedLeaderPosition = createDraggedSceneEntityPosition({
      activeDrag: args.activeDrag,
      pointerWorldInches: args.pointerWorldInches,
      dragStartPositionInches: args.leaderStartPosition,
      minZInches: leaderAssembly.configuration.sizeInches.heightInches / 2,
    });
    const placementResult = applyAssemblyPlacementRules({
      placedAssembly: {
        ...leaderAssembly,
        worldPositionInches: proposedLeaderPosition,
      },
      placedWallGraphs: args.designScene.placedWallGraphs,
      placedAssemblies: args.designScene.placedAssemblies,
      designReservationZones: args.designScene.designReservationZones,
      movingAssemblyId: leaderAssembly.id,
      snapContext: {
        movementSource: args.activeDrag.sceneViewMode,
        elevationMoveFrame: args.activeDrag.elevationMoveFrame,
      },
    });

    return {
      positionInches: placementResult.placedAssembly.worldPositionInches,
      isValid: placementResult.feedback.isValid,
      assemblyPlacementFeedback: placementResult.feedback,
      alignmentGuides: [],
    };
  }

  const leaderZone = args.designScene.designReservationZones.find((zone) => zone.id === args.activeDrag.leaderSceneEntity.entityId);

  if (leaderZone === undefined) {
    return null;
  }

  const proposedLeaderPosition = createDraggedSceneEntityPosition({
    activeDrag: args.activeDrag,
    pointerWorldInches: args.pointerWorldInches,
    dragStartPositionInches: args.leaderStartPosition,
    minZInches: 0,
  });
  const alignmentResult = alignDesignReservationZone({
    movingZone: {
      ...leaderZone,
      baseCenterPointInches: proposedLeaderPosition,
    },
    placedAssemblies: args.designScene.placedAssemblies,
    placedWallGraphs: args.designScene.placedWallGraphs,
    designReservationZones: args.designScene.designReservationZones,
    movementSource: args.activeDrag.sceneViewMode,
    elevationMoveFrame: args.activeDrag.elevationMoveFrame,
  });

  return {
    positionInches: alignmentResult.zone.baseCenterPointInches,
    isValid: true,
    assemblyPlacementFeedback: null,
    alignmentGuides: alignmentResult.alignmentGuides,
  };
}

function createDraggedSceneEntityPosition(args: {
  activeDrag: SceneEntityMultiMoveDragState;
  pointerWorldInches: Point3DInches;
  dragStartPositionInches: Point3DInches;
  minZInches: number;
}): Point3DInches {
  if (args.activeDrag.sceneViewMode === "elevation" && args.activeDrag.elevationMoveFrame !== undefined) {
    const pointerDeltaInches = {
      xInches: args.pointerWorldInches.xInches - args.activeDrag.dragStartPointerWorldInches.xInches,
      yInches: args.pointerWorldInches.yInches - args.activeDrag.dragStartPointerWorldInches.yInches,
      zInches: args.pointerWorldInches.zInches - args.activeDrag.dragStartPointerWorldInches.zInches,
    };
    const deltaAlongFaceInches =
      pointerDeltaInches.xInches * args.activeDrag.elevationMoveFrame.faceDirectionInches.xInches +
      pointerDeltaInches.yInches * args.activeDrag.elevationMoveFrame.faceDirectionInches.yInches +
      pointerDeltaInches.zInches * args.activeDrag.elevationMoveFrame.faceDirectionInches.zInches;

    return {
      xInches: args.dragStartPositionInches.xInches + args.activeDrag.elevationMoveFrame.faceDirectionInches.xInches * deltaAlongFaceInches,
      yInches: args.dragStartPositionInches.yInches + args.activeDrag.elevationMoveFrame.faceDirectionInches.yInches * deltaAlongFaceInches,
      zInches: Math.max(args.minZInches, args.dragStartPositionInches.zInches + pointerDeltaInches.zInches),
    };
  }

  return {
    xInches: args.dragStartPositionInches.xInches + args.pointerWorldInches.xInches - args.activeDrag.dragStartPointerWorldInches.xInches,
    yInches: args.dragStartPositionInches.yInches + args.pointerWorldInches.yInches - args.activeDrag.dragStartPointerWorldInches.yInches,
    zInches: args.dragStartPositionInches.zInches,
  };
}

function createMovedSceneEntityPositions(args: {
  activeDrag: SceneEntityMultiMoveDragState;
  deltaInches: Point3DInches;
}): Readonly<Record<string, Point3DInches>> {
  return Object.fromEntries(
    args.activeDrag.sceneEntities.map((sceneEntity) => {
      const sceneEntityKey = createSceneEntitySelectionKey(sceneEntity);
      const startPosition = args.activeDrag.dragStartPositionsBySceneEntityKey[sceneEntityKey];
      return [
        sceneEntityKey,
        startPosition === undefined
          ? args.deltaInches
          : {
              xInches: startPosition.xInches + args.deltaInches.xInches,
              yInches: startPosition.yInches + args.deltaInches.yInches,
              zInches: sceneEntity.entityKind === "design-reservation-zone"
                ? Math.max(0, startPosition.zInches + args.deltaInches.zInches)
                : startPosition.zInches + args.deltaInches.zInches,
            },
      ];
    }),
  );
}

function createDesignSceneWithSceneEntityPositions(args: {
  designScene: DesignScene;
  positionsBySceneEntityKey: Readonly<Record<string, Point3DInches>>;
}): DesignScene {
  return {
    ...args.designScene,
    placedAssemblies: args.designScene.placedAssemblies.map((assembly) => {
      const positionInches = args.positionsBySceneEntityKey[createSceneEntitySelectionKey({ entityKind: "placed-assembly", entityId: assembly.id })];
      return positionInches === undefined ? assembly : { ...assembly, worldPositionInches: positionInches };
    }),
    designReservationZones: args.designScene.designReservationZones.map((zone) => {
      const positionInches = args.positionsBySceneEntityKey[createSceneEntitySelectionKey({ entityKind: "design-reservation-zone", entityId: zone.id })];
      return positionInches === undefined ? zone : { ...zone, baseCenterPointInches: positionInches };
    }),
  };
}

function getSceneEntityPosition(
  designScene: DesignScene,
  sceneEntity: SceneEntitySelectionRef,
): Point3DInches | null {
  if (sceneEntity.entityKind === "placed-assembly") {
    return designScene.placedAssemblies.find((assembly) => assembly.id === sceneEntity.entityId)?.worldPositionInches ?? null;
  }

  return designScene.designReservationZones.find((zone) => zone.id === sceneEntity.entityId)?.baseCenterPointInches ?? null;
}
