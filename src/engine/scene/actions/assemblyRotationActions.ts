import type { Point3DInches } from "@/core/geometry/pointTypes";
import { applyAssemblyPlacementRules, createAssemblyPlacementFeedback } from "@/engine/assemblies/placement/assemblyPlacementFeedback";
import { updateAssemblyPlacementRotationDegrees } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import { snapAssemblyRotationDegrees } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";

export function createAssemblyRotationActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  "startAssemblyRotationDrag" | "updateAssemblyRotationDrag" | "finishAssemblyRotationDrag" | "cancelAssemblyRotationDrag"
> {
  return {
    startAssemblyRotationDrag({ assemblyId, centerPointInches, pointerWorldInches }) {
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
          startWorldPositionInches: placedAssembly.worldPositionInches,
          latestRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
          latestValidRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
          isSnappedToRotationStop: false,
        },
        assemblyPlacementFeedback: createAssemblyPlacementFeedback({
          placedAssembly,
          placedWallGraphs: get().designScene.placedWallGraphs,
          snapContext: { movementSource: get().activeSceneViewMode },
        }),
      });
    },

    updateAssemblyRotationDrag(pointerWorldInches) {
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
      const { designScene } = get();
      const placementResult = applyAssemblyPlacementRules({
        placedAssembly: rotatedAssembly,
        placedWallGraphs: designScene.placedWallGraphs,
        placedAssemblies: designScene.placedAssemblies,
        designReservationZones: designScene.designReservationZones,
        movingAssemblyId: activeDrag.assemblyId,
        snapContext: { movementSource: get().activeSceneViewMode },
      });
      const feedback = placementResult.feedback;
      const isValidPlacement = true;

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
            assembly.id === activeDrag.assemblyId ? placementResult.placedAssembly : assembly,
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
                ? {
                    ...updateAssemblyPlacementRotationDegrees(assembly, activeDrag.latestValidRotationDegrees),
                    worldPositionInches: activeDrag.startWorldPositionInches,
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
              ? {
                  ...updateAssemblyPlacementRotationDegrees(assembly, activeDrag.startRotationDegrees),
                  worldPositionInches: activeDrag.startWorldPositionInches,
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
