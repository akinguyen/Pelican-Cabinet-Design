import type { Point3DInches } from "@/core/geometry/pointTypes";
import { createAssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import { updateAssemblyPlacementRotationDegrees } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import { snapAssemblyRotationDegrees } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

export function createAssemblyRotationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "startAssemblyRotationDrag" | "updateAssemblyRotationDrag" | "finishAssemblyRotationDrag" | "cancelAssemblyRotationDrag"
> {
  return {
    startAssemblyRotationDrag({ assemblyId, centerPointInches, pointerWorldInches }) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const placedAssembly = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === assemblyId,
      );

      if (placedAssembly === undefined) {
        return;
      }

      const pointerAngleDegrees = getPointerAngleDegrees(centerPointInches, pointerWorldInches);

      set({
        activeDrag: {
          kind: "assembly-rotation",
          assemblyId,
          centerPointInches,
          pointerAngleDegrees,
          startPointerAngleDegrees: pointerAngleDegrees,
          startRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
          latestRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
          latestValidRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
          isSnappedToRotationStop: false,
        },
        assemblyPlacementFeedback: createAssemblyPlacementFeedback({
          placedAssembly,
        }),
      });
    },

    updateAssemblyRotationDrag(pointerWorldInches) {
      if (!canManuallyEditScene(get().workspaceMode)) {
        return;
      }

      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "assembly-rotation") {
        return;
      }

      const placedAssembly = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === activeDrag.assemblyId,
      );

      if (placedAssembly === undefined) {
        return;
      }

      const pointerAngleDegrees = getPointerAngleDegrees(activeDrag.centerPointInches, pointerWorldInches);
      const rotationDeltaDegrees = activeDrag.startPointerAngleDegrees - pointerAngleDegrees;
      const snapResult = snapAssemblyRotationDegrees(activeDrag.startRotationDegrees + rotationDeltaDegrees);
      const rotatedAssembly = updateAssemblyPlacementRotationDegrees(
        placedAssembly,
        snapResult.rotationDegrees,
      );
      const feedback = createAssemblyPlacementFeedback({
        placedAssembly: rotatedAssembly,
      });
      const isValidPlacement = true;

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
            assembly.id === activeDrag.assemblyId ? rotatedAssembly : assembly,
          ),
        },
        activeDrag: {
          ...activeDrag,
          pointerAngleDegrees,
          latestRotationDegrees: snapResult.rotationDegrees,
          latestValidRotationDegrees: isValidPlacement
            ? snapResult.rotationDegrees
            : activeDrag.latestValidRotationDegrees,
          isSnappedToRotationStop: snapResult.isSnappedToRotationStop,
        },
        assemblyPlacementFeedback: feedback,
      }));
    },

    finishAssemblyRotationDrag() {
      const activeDrag = get().activeDrag;
      const placementFeedback = get().assemblyPlacementFeedback;

      if (activeDrag?.kind !== "assembly-rotation") {
        set({ activeDrag: null, assemblyPlacementFeedback: null });
        return;
      }

      if (placementFeedback?.isValid === false) {
        set((state) => ({
          designScene: {
            ...state.designScene,
            placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
              assembly.id === activeDrag.assemblyId
                ? updateAssemblyPlacementRotationDegrees(assembly, activeDrag.latestValidRotationDegrees)
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

    cancelAssemblyRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "assembly-rotation") {
        set({ activeDrag: null, assemblyPlacementFeedback: null });
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
            assembly.id === activeDrag.assemblyId
              ? updateAssemblyPlacementRotationDegrees(assembly, activeDrag.startRotationDegrees)
              : assembly,
          ),
        },
        activeDrag: null,
        assemblyPlacementFeedback: null,
      }));
    },
  };
}

function getPointerAngleDegrees(
  centerPointInches: Point3DInches,
  pointerWorldInches: Point3DInches,
): number {
  return (
    Math.atan2(
      pointerWorldInches.yInches - centerPointInches.yInches,
      pointerWorldInches.xInches - centerPointInches.xInches,
    ) *
    180
  ) / Math.PI;
}
