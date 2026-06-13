import type { Point3DInches } from "@/core/geometry/pointTypes";
import { applyAssemblyWallPlacementRules, createAssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import type { AssemblyMoveDragState } from "../sceneDragTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createAssemblyDragActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "startAssemblyDrag" | "updateAssemblyDrag" | "finishAssemblyDrag" | "cancelAssemblyDrag"
> {
  return {
    startAssemblyDrag({ assemblyId, pointerWorldInches, sceneViewMode, elevationMoveFrame }) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const placedAssembly = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === assemblyId,
      );

      if (placedAssembly === undefined) {
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
        }),
      });
    },

    updateAssemblyDrag(pointerWorldInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "assembly-move") {
        return;
      }

      const placedAssembly = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === activeDrag.assemblyId,
      );

      if (placedAssembly === undefined) {
        return;
      }

      const proposedWorldPositionInches = createDraggedAssemblyWorldPosition(
        activeDrag,
        pointerWorldInches,
        placedAssembly.configuration.sizeInches.heightInches,
      );
      const proposedPlacedAssembly = {
        ...placedAssembly,
        worldPositionInches: proposedWorldPositionInches,
      };
      const placementResult = activeDrag.sceneViewMode === "elevation"
        ? {
            placedAssembly: proposedPlacedAssembly,
            feedback: createAssemblyPlacementFeedback({
              placedAssembly: proposedPlacedAssembly,
            }),
          }
        : applyAssemblyWallPlacementRules({
            placedAssembly: proposedPlacedAssembly,
          });
      const nextActiveDrag: AssemblyMoveDragState = {
        ...activeDrag,
        latestValidWorldPositionInches: placementResult.feedback.isValid
          ? placementResult.placedAssembly.worldPositionInches
          : activeDrag.latestValidWorldPositionInches,
      };

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
            assembly.id === activeDrag.assemblyId
              ? placementResult.placedAssembly
              : assembly,
          ),
        },
        activeDrag: nextActiveDrag,
        assemblyPlacementFeedback: placementResult.feedback,
      }));
    },

    finishAssemblyDrag() {
      const activeDrag = get().activeDrag;
      const placementFeedback = get().assemblyPlacementFeedback;

      if (activeDrag?.kind !== "assembly-move") {
        set({ activeDrag: null, assemblyPlacementFeedback: null });
        return;
      }

      if (placementFeedback?.isValid === false) {
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

      set({ activeDrag: null, assemblyPlacementFeedback: null });
    },

    cancelAssemblyDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "assembly-move") {
        set({ activeDrag: null, assemblyPlacementFeedback: null });
        return;
      }

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
    },
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
