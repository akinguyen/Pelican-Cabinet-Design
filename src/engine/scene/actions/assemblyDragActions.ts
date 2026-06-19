import type { Point3DInches } from "@/core/geometry/pointTypes";
import { applyAssemblyPlacementRules, createAssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import type { AssemblyMoveDragState } from "../sceneDragTypes";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { createSceneEntityMultiMoveDragState, getSelectedSceneEntitiesForMultiDrag } from "./sceneEntityDragActions";
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

      const selectedSceneEntitiesForDrag = getSelectedSceneEntitiesForMultiDrag({
        activeSelection: state.designScene.activeSelection,
        leaderSceneEntity: { entityKind: "placed-assembly", entityId: assemblyId },
        placedAssemblies: state.designScene.placedAssemblies,
        designReservationZones: state.designScene.designReservationZones,
      });

      if (selectedSceneEntitiesForDrag.length > 1) {
        set({
          activeDrag: createSceneEntityMultiMoveDragState({
            leaderSceneEntity: { entityKind: "placed-assembly", entityId: assemblyId },
            sceneEntities: selectedSceneEntitiesForDrag,
            pointerWorldInches,
            designScene: state.designScene,
            sceneViewMode,
            elevationMoveFrame,
          }),
          assemblyPlacementFeedback: createAssemblyPlacementFeedback({
            placedAssembly,
            placedWallGraphs: state.designScene.placedWallGraphs,
            snapContext: { movementSource: sceneViewMode, elevationMoveFrame },
          }),
          activeObjectAlignmentGuides: [],
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
