import { alignDesignReservationZone } from "@/engine/design-zones/designReservationZoneAlignment";
import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { DesignReservationZoneMoveDragState } from "../sceneDragTypes";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { createSceneEntityMultiMoveDragState, getSelectedSceneEntitiesForMultiDrag } from "./sceneEntityDragActions";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createDesignReservationZoneDragActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "startDesignReservationZoneDrag"
  | "updateDesignReservationZoneDrag"
  | "finishDesignReservationZoneDrag"
  | "cancelDesignReservationZoneDrag"
> {
  return {
    startDesignReservationZoneDrag({ designReservationZoneId, pointerWorldInches, sceneViewMode, elevationMoveFrame }) {
      const zone = get().designScene.designReservationZones.find((candidate) => candidate.id === designReservationZoneId);

      if (zone === undefined) {
        return;
      }

      const state = get();
      const selectedSceneEntitiesForDrag = getSelectedSceneEntitiesForMultiDrag({
        activeSelection: state.designScene.activeSelection,
        leaderSceneEntity: { entityKind: "design-reservation-zone", entityId: designReservationZoneId },
        placedAssemblies: state.designScene.placedAssemblies,
        designReservationZones: state.designScene.designReservationZones,
      });

      if (selectedSceneEntitiesForDrag.length > 1) {
        set({
          activeDrag: createSceneEntityMultiMoveDragState({
            leaderSceneEntity: { entityKind: "design-reservation-zone", entityId: designReservationZoneId },
            sceneEntities: selectedSceneEntitiesForDrag,
            pointerWorldInches,
            designScene: state.designScene,
            sceneViewMode,
            elevationMoveFrame,
          }),
          assemblyPlacementFeedback: null,
          activeObjectAlignmentGuides: [],
        });
        return;
      }

      set({
        activeDrag: {
          kind: "design-reservation-zone-move",
          designReservationZoneId,
          dragStartPointerWorldInches: pointerWorldInches,
          dragStartBaseCenterPointInches: zone.baseCenterPointInches,
          sceneViewMode,
          elevationMoveFrame,
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      });
    },

    updateDesignReservationZoneDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-move") {
        return;
      }

      const zone = get().designScene.designReservationZones.find(
        (candidate) => candidate.id === activeDrag.designReservationZoneId,
      );

      if (zone === undefined) {
        return;
      }

      const proposedBaseCenterPointInches = createDraggedDesignReservationZoneBaseCenterPoint(
        activeDrag,
        pointerWorldInches,
      );
      const proposedZone = {
        ...zone,
        baseCenterPointInches: proposedBaseCenterPointInches,
      };
      const { designScene } = get();
      const alignmentResult = alignDesignReservationZone({
        movingZone: proposedZone,
        placedAssemblies: designScene.placedAssemblies,
        placedWallGraphs: designScene.placedWallGraphs,
        designReservationZones: designScene.designReservationZones,
        movementSource: activeDrag.sceneViewMode,
        elevationMoveFrame: activeDrag.elevationMoveFrame,
      });
      const nextBaseCenterPointInches = alignmentResult.zone.baseCenterPointInches;

      set((state) => ({
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.map((candidate) => (
            candidate.id === activeDrag.designReservationZoneId
              ? {
                  ...candidate,
                  baseCenterPointInches: nextBaseCenterPointInches,
                }
              : candidate
          )),
        },
        activeObjectAlignmentGuides: alignmentResult.alignmentGuides,
      }));
    },

    finishDesignReservationZoneDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-move") {
        return;
      }

      recordDesignSceneHistoryEntry({
        get,
        set,
        label: "Move design reservation zone",
        designScene: createDesignSceneWithDesignReservationZoneBaseCenterPoint({
          designScene: get().designScene,
          designReservationZoneId: activeDrag.designReservationZoneId,
          baseCenterPointInches: activeDrag.dragStartBaseCenterPointInches,
        }),
      });

      set({ activeDrag: null, activeObjectAlignmentGuides: [] });
    },

    cancelDesignReservationZoneDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "design-reservation-zone-move") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          designReservationZones: state.designScene.designReservationZones.map((zone) => (
            zone.id === activeDrag.designReservationZoneId
              ? {
                  ...zone,
                  baseCenterPointInches: activeDrag.dragStartBaseCenterPointInches,
                }
              : zone
          )),
        },
        activeDrag: null,
        activeObjectAlignmentGuides: [],
      }));
    },
  };
}


function createDesignSceneWithDesignReservationZoneBaseCenterPoint(args: {
  designScene: DesignScene;
  designReservationZoneId: string;
  baseCenterPointInches: Point3DInches;
}): DesignScene {
  return {
    ...args.designScene,
    designReservationZones: args.designScene.designReservationZones.map((zone) => (
      zone.id === args.designReservationZoneId
        ? {
            ...zone,
            baseCenterPointInches: args.baseCenterPointInches,
          }
        : zone
    )),
  };
}

function createDraggedDesignReservationZoneBaseCenterPoint(
  activeDrag: DesignReservationZoneMoveDragState,
  pointerWorldInches: Point3DInches,
): Point3DInches {
  if (activeDrag.sceneViewMode === "elevation" && activeDrag.elevationMoveFrame !== undefined) {
    const pointerDeltaInches = {
      xInches: pointerWorldInches.xInches - activeDrag.dragStartPointerWorldInches.xInches,
      yInches: pointerWorldInches.yInches - activeDrag.dragStartPointerWorldInches.yInches,
      zInches: pointerWorldInches.zInches - activeDrag.dragStartPointerWorldInches.zInches,
    };
    const deltaAlongFaceInches =
      pointerDeltaInches.xInches * activeDrag.elevationMoveFrame.faceDirectionInches.xInches +
      pointerDeltaInches.yInches * activeDrag.elevationMoveFrame.faceDirectionInches.yInches +
      pointerDeltaInches.zInches * activeDrag.elevationMoveFrame.faceDirectionInches.zInches;

    return {
      xInches:
        activeDrag.dragStartBaseCenterPointInches.xInches +
        activeDrag.elevationMoveFrame.faceDirectionInches.xInches * deltaAlongFaceInches,
      yInches:
        activeDrag.dragStartBaseCenterPointInches.yInches +
        activeDrag.elevationMoveFrame.faceDirectionInches.yInches * deltaAlongFaceInches,
      zInches: Math.max(0, activeDrag.dragStartBaseCenterPointInches.zInches + pointerDeltaInches.zInches),
    };
  }

  return {
    xInches:
      activeDrag.dragStartBaseCenterPointInches.xInches +
      pointerWorldInches.xInches -
      activeDrag.dragStartPointerWorldInches.xInches,
    yInches:
      activeDrag.dragStartBaseCenterPointInches.yInches +
      pointerWorldInches.yInches -
      activeDrag.dragStartPointerWorldInches.yInches,
    zInches: activeDrag.dragStartBaseCenterPointInches.zInches,
  };
}
