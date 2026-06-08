import type { Point3DInches } from "@/core/geometry/pointTypes";
import type { AssemblyDragState } from "../sceneDragTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createAssemblyDragActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "startAssemblyDrag" | "updateAssemblyDrag" | "finishAssemblyDrag" | "cancelAssemblyDrag"
> {
  return {
    startAssemblyDrag({ assemblyId, pointerWorldInches, sceneViewMode }) {
      if (get().workspaceMode !== "editor") {
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
          assemblyId,
          dragStartPointerWorldInches: pointerWorldInches,
          dragStartWorldPositionInches: placedAssembly.worldPositionInches,
          sceneViewMode,
        },
      });
    },

    updateAssemblyDrag(pointerWorldInches) {
      if (get().workspaceMode !== "editor") {
        return;
      }

      const activeDrag = get().activeDrag;

      if (activeDrag === null) {
        return;
      }

      const placedAssembly = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === activeDrag.assemblyId,
      );

      if (placedAssembly === undefined) {
        return;
      }

      const nextWorldPositionInches = createDraggedAssemblyWorldPosition(
        activeDrag,
        pointerWorldInches,
        placedAssembly.configuration.sizeInches.heightInches,
      );

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
            assembly.id === activeDrag.assemblyId
              ? {
                  ...assembly,
                  worldPositionInches: nextWorldPositionInches,
                }
              : assembly,
          ),
        },
      }));
    },

    finishAssemblyDrag() {
      set({ activeDrag: null });
    },

    cancelAssemblyDrag() {
      set({ activeDrag: null });
    },
  };
}

function createDraggedAssemblyWorldPosition(
  activeDrag: AssemblyDragState,
  pointerWorldInches: Point3DInches,
  assemblyHeightInches: number,
): Point3DInches {
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
