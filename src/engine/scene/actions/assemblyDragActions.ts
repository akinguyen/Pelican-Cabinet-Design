import type { Point3DInches } from "@/core/geometry/pointTypes";
import { applyAssemblyPlacementRules, createAssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import type { AssemblyMoveDragState, AssemblyMultiMoveDragState } from "../sceneDragTypes";
import type { DesignScene, } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createAssemblyDragActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "startAssemblyDrag" | "updateAssemblyDrag" | "finishAssemblyDrag" | "cancelAssemblyDrag"
> {
  return {
    startAssemblyDrag({ assemblyId, pointerWorldInches, sceneViewMode, elevationMoveFrame }) {
      const state = get();
      const placedAssembly = state.designScene.placedAssemblies.find(
        (assembly) => assembly.id === assemblyId,
      );

      if (placedAssembly === undefined) {
        return;
      }

      const multiSelectedAssemblyIds = getMultiSelectedAssemblyIdsForDrag({
        activeSelection: state.designScene.activeSelection,
        leaderAssemblyId: assemblyId,
        placedAssemblies: state.designScene.placedAssemblies,
      });

      if (multiSelectedAssemblyIds.length > 1) {
        const dragStartWorldPositionsByAssemblyId = Object.fromEntries(
          multiSelectedAssemblyIds.map((selectedAssemblyId) => {
            const selectedAssembly = state.designScene.placedAssemblies.find((assembly) => assembly.id === selectedAssemblyId);
            return [selectedAssemblyId, selectedAssembly?.worldPositionInches ?? placedAssembly.worldPositionInches];
          }),
        );

        set({
          activeDrag: {
            kind: "assembly-multi-move",
            leaderAssemblyId: assemblyId,
            assemblyIds: multiSelectedAssemblyIds,
            dragStartPointerWorldInches: pointerWorldInches,
            dragStartWorldPositionsByAssemblyId,
            latestValidWorldPositionsByAssemblyId: dragStartWorldPositionsByAssemblyId,
            sceneViewMode,
            elevationMoveFrame,
          },
          assemblyPlacementFeedback: createAssemblyPlacementFeedback({
            placedAssembly,
            placedWallGraphs: state.designScene.placedWallGraphs,
            snapContext: { movementSource: sceneViewMode, elevationMoveFrame },
          }),
        });
        return;
      }

      set({
        activeDrag: {
          kind: "assembly-move",
          assemblyId,
          dragStartPointerWorldInches: pointerWorldInches,
          dragStartWorldPositionInches: placedAssembly.worldPositionInches,
          latestValidWorldPositionInches: placedAssembly.worldPositionInches,
          sceneViewMode,
          elevationMoveFrame,
        },
        assemblyPlacementFeedback: createAssemblyPlacementFeedback({
          placedAssembly,
          placedWallGraphs: state.designScene.placedWallGraphs,
          snapContext: { movementSource: sceneViewMode, elevationMoveFrame },
        }),
      });
    },

    updateAssemblyDrag(pointerWorldInches) {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind === "assembly-move") {
        updateSingleAssemblyDrag({ activeDrag, pointerWorldInches, get, set });
        return;
      }

      if (activeDrag?.kind === "assembly-multi-move") {
        updateMultiAssemblyDrag({ activeDrag, pointerWorldInches, get, set });
      }
    },

    finishAssemblyDrag() {
      const activeDrag = get().activeDrag;
      const placementFeedback = get().assemblyPlacementFeedback;

      if (activeDrag?.kind === "assembly-move") {
        const previousDesignScene = createDesignSceneWithSingleAssemblyPosition({
          designScene: get().designScene,
          assemblyId: activeDrag.assemblyId,
          worldPositionInches: activeDrag.dragStartWorldPositionInches,
        });

        if (placementFeedback?.isValid === false) {
          recordDesignSceneHistoryEntry({ get, set, label: "Move assembly", designScene: previousDesignScene });
          set((state) => ({
            designScene: {
              ...state.designScene,
              placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
                assembly.id === activeDrag.assemblyId
                  ? {
                      ...assembly,
                      worldPositionInches: activeDrag.latestValidWorldPositionInches,
                    }
                  : assembly,
              ),
            },
            activeDrag: null,
            assemblyPlacementFeedback: null,
          }));
          return;
        }

        recordDesignSceneHistoryEntry({ get, set, label: "Move assembly", designScene: previousDesignScene });
        set({ activeDrag: null, assemblyPlacementFeedback: null });
        return;
      }

      if (activeDrag?.kind === "assembly-multi-move") {
        const previousDesignScene = createDesignSceneWithAssemblyPositions({
          designScene: get().designScene,
          worldPositionsByAssemblyId: activeDrag.dragStartWorldPositionsByAssemblyId,
        });

        recordDesignSceneHistoryEntry({ get, set, label: "Move selected assemblies", designScene: previousDesignScene });

        if (placementFeedback?.isValid === false) {
          set((state) => ({
            designScene: createDesignSceneWithAssemblyPositions({
              designScene: state.designScene,
              worldPositionsByAssemblyId: activeDrag.latestValidWorldPositionsByAssemblyId,
            }),
            activeDrag: null,
            assemblyPlacementFeedback: null,
          }));
          return;
        }

        set({ activeDrag: null, assemblyPlacementFeedback: null });
        return;
      }

      set({ activeDrag: null, assemblyPlacementFeedback: null });
    },

    cancelAssemblyDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind === "assembly-move") {
        set((state) => ({
          designScene: {
            ...state.designScene,
            placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
              assembly.id === activeDrag.assemblyId
                ? {
                    ...assembly,
                    worldPositionInches: activeDrag.dragStartWorldPositionInches,
                  }
                : assembly,
            ),
          },
          activeDrag: null,
          assemblyPlacementFeedback: null,
        }));
        return;
      }

      if (activeDrag?.kind === "assembly-multi-move") {
        set((state) => ({
          designScene: createDesignSceneWithAssemblyPositions({
            designScene: state.designScene,
            worldPositionsByAssemblyId: activeDrag.dragStartWorldPositionsByAssemblyId,
          }),
          activeDrag: null,
          assemblyPlacementFeedback: null,
        }));
        return;
      }

      set({ activeDrag: null, assemblyPlacementFeedback: null });
    },
  };
}

function updateSingleAssemblyDrag(args: {
  activeDrag: AssemblyMoveDragState;
  pointerWorldInches: Point3DInches;
  get: DesignSceneStoreGetter;
  set: DesignSceneStoreSetter;
}): void {
  const placedAssembly = args.get().designScene.placedAssemblies.find(
    (assembly) => assembly.id === args.activeDrag.assemblyId,
  );

  if (placedAssembly === undefined) {
    return;
  }

  const proposedWorldPositionInches = createDraggedAssemblyWorldPosition(
    args.activeDrag,
    args.pointerWorldInches,
    placedAssembly.configuration.sizeInches.heightInches,
  );
  const proposedPlacedAssembly = {
    ...placedAssembly,
    worldPositionInches: proposedWorldPositionInches,
  };
  const { designScene } = args.get();
  const placementResult = applyAssemblyPlacementRules({
    placedAssembly: proposedPlacedAssembly,
    placedWallGraphs: designScene.placedWallGraphs,
    placedAssemblies: designScene.placedAssemblies,
    designReservationZones: designScene.designReservationZones,
    movingAssemblyId: args.activeDrag.assemblyId,
    snapContext: {
      movementSource: args.activeDrag.sceneViewMode,
      elevationMoveFrame: args.activeDrag.elevationMoveFrame,
    },
  });
  const nextActiveDrag: AssemblyMoveDragState = {
    ...args.activeDrag,
    latestValidWorldPositionInches: placementResult.feedback.isValid
      ? placementResult.placedAssembly.worldPositionInches
      : args.activeDrag.latestValidWorldPositionInches,
  };

  args.set((state) => ({
    designScene: {
      ...state.designScene,
      placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
        assembly.id === args.activeDrag.assemblyId
          ? placementResult.placedAssembly
          : assembly,
      ),
    },
    activeDrag: nextActiveDrag,
    assemblyPlacementFeedback: placementResult.feedback,
  }));
}

function updateMultiAssemblyDrag(args: {
  activeDrag: AssemblyMultiMoveDragState;
  pointerWorldInches: Point3DInches;
  get: DesignSceneStoreGetter;
  set: DesignSceneStoreSetter;
}): void {
  const designScene = args.get().designScene;
  const leaderAssembly = designScene.placedAssemblies.find((assembly) => assembly.id === args.activeDrag.leaderAssemblyId);
  const leaderStartWorldPositionInches = args.activeDrag.dragStartWorldPositionsByAssemblyId[args.activeDrag.leaderAssemblyId];

  if (leaderAssembly === undefined || leaderStartWorldPositionInches === undefined) {
    return;
  }

  const leaderDrag: AssemblyMoveDragState = {
    kind: "assembly-move",
    assemblyId: args.activeDrag.leaderAssemblyId,
    dragStartPointerWorldInches: args.activeDrag.dragStartPointerWorldInches,
    dragStartWorldPositionInches: leaderStartWorldPositionInches,
    latestValidWorldPositionInches: leaderStartWorldPositionInches,
    sceneViewMode: args.activeDrag.sceneViewMode,
    elevationMoveFrame: args.activeDrag.elevationMoveFrame,
  };
  const proposedLeaderWorldPositionInches = createDraggedAssemblyWorldPosition(
    leaderDrag,
    args.pointerWorldInches,
    leaderAssembly.configuration.sizeInches.heightInches,
  );
  const proposedLeaderAssembly = {
    ...leaderAssembly,
    worldPositionInches: proposedLeaderWorldPositionInches,
  };
  const placementResult = applyAssemblyPlacementRules({
    placedAssembly: proposedLeaderAssembly,
    placedWallGraphs: designScene.placedWallGraphs,
    placedAssemblies: designScene.placedAssemblies,
    designReservationZones: designScene.designReservationZones,
    movingAssemblyId: args.activeDrag.leaderAssemblyId,
    snapContext: {
      movementSource: args.activeDrag.sceneViewMode,
      elevationMoveFrame: args.activeDrag.elevationMoveFrame,
    },
  });
  const snappedLeaderWorldPositionInches = placementResult.placedAssembly.worldPositionInches;
  const deltaInches = {
    xInches: snappedLeaderWorldPositionInches.xInches - leaderStartWorldPositionInches.xInches,
    yInches: snappedLeaderWorldPositionInches.yInches - leaderStartWorldPositionInches.yInches,
    zInches: snappedLeaderWorldPositionInches.zInches - leaderStartWorldPositionInches.zInches,
  };
  const selectedIds = new Set(args.activeDrag.assemblyIds);
  const nextWorldPositionsByAssemblyId = Object.fromEntries(
    args.activeDrag.assemblyIds.map((assemblyId) => {
      const startPosition = args.activeDrag.dragStartWorldPositionsByAssemblyId[assemblyId];
      return [
        assemblyId,
        startPosition === undefined
          ? snappedLeaderWorldPositionInches
          : {
              xInches: startPosition.xInches + deltaInches.xInches,
              yInches: startPosition.yInches + deltaInches.yInches,
              zInches: startPosition.zInches + deltaInches.zInches,
            },
      ];
    }),
  );
  const nextActiveDrag: AssemblyMultiMoveDragState = {
    ...args.activeDrag,
    latestValidWorldPositionsByAssemblyId: placementResult.feedback.isValid
      ? nextWorldPositionsByAssemblyId
      : args.activeDrag.latestValidWorldPositionsByAssemblyId,
  };

  args.set((state) => ({
    designScene: {
      ...state.designScene,
      placedAssemblies: state.designScene.placedAssemblies.map((assembly) => {
        if (!selectedIds.has(assembly.id)) {
          return assembly;
        }

        const worldPositionInches = nextWorldPositionsByAssemblyId[assembly.id];
        return worldPositionInches === undefined ? assembly : { ...assembly, worldPositionInches };
      }),
    },
    activeDrag: nextActiveDrag,
    assemblyPlacementFeedback: placementResult.feedback,
  }));
}

function getMultiSelectedAssemblyIdsForDrag(args: {
  activeSelection: DesignScene["activeSelection"];
  leaderAssemblyId: string;
  placedAssemblies: readonly PlacedAssembly[];
}): readonly string[] {
  if (args.activeSelection?.kind !== "placed-assemblies" || !args.activeSelection.placedAssemblyIds.includes(args.leaderAssemblyId)) {
    return [args.leaderAssemblyId];
  }

  const existingIds = new Set(args.placedAssemblies.map((assembly) => assembly.id));
  return args.activeSelection.placedAssemblyIds.filter((assemblyId) => existingIds.has(assemblyId));
}

function createDesignSceneWithSingleAssemblyPosition(args: {
  designScene: DesignScene;
  assemblyId: string;
  worldPositionInches: Point3DInches;
}): DesignScene {
  return createDesignSceneWithAssemblyPositions({
    designScene: args.designScene,
    worldPositionsByAssemblyId: {
      [args.assemblyId]: args.worldPositionInches,
    },
  });
}

function createDesignSceneWithAssemblyPositions(args: {
  designScene: DesignScene;
  worldPositionsByAssemblyId: Readonly<Record<string, Point3DInches>>;
}): DesignScene {
  return {
    ...args.designScene,
    placedAssemblies: args.designScene.placedAssemblies.map((assembly) => {
      const worldPositionInches = args.worldPositionsByAssemblyId[assembly.id];
      return worldPositionInches === undefined ? assembly : { ...assembly, worldPositionInches };
    }),
  };
}

function createDraggedAssemblyWorldPosition(
  activeDrag: AssemblyMoveDragState,
  pointerWorldInches: Point3DInches,
  assemblyHeightInches: number,
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
    const deltaZInches = pointerDeltaInches.zInches;

    return {
      xInches:
        activeDrag.dragStartWorldPositionInches.xInches +
        activeDrag.elevationMoveFrame.faceDirectionInches.xInches * deltaAlongFaceInches,
      yInches:
        activeDrag.dragStartWorldPositionInches.yInches +
        activeDrag.elevationMoveFrame.faceDirectionInches.yInches * deltaAlongFaceInches,
      zInches: Math.max(
        assemblyHeightInches / 2,
        activeDrag.dragStartWorldPositionInches.zInches + deltaZInches,
      ),
    };
  }

  const deltaXInches = pointerWorldInches.xInches - activeDrag.dragStartPointerWorldInches.xInches;

  if (activeDrag.sceneViewMode === "elevation") {
    const deltaZInches = pointerWorldInches.zInches - activeDrag.dragStartPointerWorldInches.zInches;

    return {
      xInches: activeDrag.dragStartWorldPositionInches.xInches + deltaXInches,
      yInches: activeDrag.dragStartWorldPositionInches.yInches,
      zInches: Math.max(
        assemblyHeightInches / 2,
        activeDrag.dragStartWorldPositionInches.zInches + deltaZInches,
      ),
    };
  }

  return {
    xInches: activeDrag.dragStartWorldPositionInches.xInches + deltaXInches,
    yInches:
      activeDrag.dragStartWorldPositionInches.yInches +
      pointerWorldInches.yInches -
      activeDrag.dragStartPointerWorldInches.yInches,
    zInches: activeDrag.dragStartWorldPositionInches.zInches,
  };
}
