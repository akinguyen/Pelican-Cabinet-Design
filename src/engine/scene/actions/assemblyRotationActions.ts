import type { Point3DInches } from "@/core/geometry/pointTypes";
import { getPlanPointerAngleDegrees } from "@/core/geometry/planPointGeometry";
import { updateAssemblyPlacementRotationDegrees } from "@/engine/assemblies/placement/assemblyPlacementGeometry";
import { snapAssemblyRotationDegrees } from "@/engine/assemblies/placement/assemblyRotationSnapping";
import type { DesignScene } from "../designSceneTypes";
import type { DesignSceneStore, DesignSceneStoreGetter, DesignSceneStoreSetter } from "../designSceneStoreTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

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

      const pointerAngleDegrees = getPlanPointerAngleDegrees(centerPointInches, pointerWorldInches);

      set({
        activeDrag: {
          kind: "assembly-rotation",
          assemblyId,
          centerPointInches,
          startPointerAngleDegrees: pointerAngleDegrees,
          startRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
          startWorldPositionInches: placedAssembly.worldPositionInches,
          latestValidRotationDegrees: placedAssembly.rotationDegrees.zDegrees,
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
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

      const pointerAngleDegrees = getPlanPointerAngleDegrees(activeDrag.centerPointInches, pointerWorldInches);
      const rotationDeltaDegrees = activeDrag.startPointerAngleDegrees - pointerAngleDegrees;
      const snapResult = snapAssemblyRotationDegrees(activeDrag.startRotationDegrees + rotationDeltaDegrees);
      const rotatedAssembly = updateAssemblyPlacementRotationDegrees(
        placedAssembly,
        snapResult.rotationDegrees,
      );

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
            assembly.id === activeDrag.assemblyId ? rotatedAssembly : assembly,
          ),
        },
        activeDrag: {
          ...activeDrag,
          latestValidRotationDegrees: snapResult.rotationDegrees,
        },
        assemblyPlacementFeedback: null,
        activeObjectAlignmentGuides: [],
      }));
    },

    finishAssemblyRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "assembly-rotation") {
        set({ activeDrag: null, assemblyPlacementFeedback: null, activeObjectAlignmentGuides: [] });
        return;
      }

      recordDesignSceneHistoryEntry({
        get,
        set,
        label: "Rotate assembly",
        designScene: createDesignSceneWithAssemblyRotation({
          designScene: get().designScene,
          assemblyId: activeDrag.assemblyId,
          rotationDegrees: activeDrag.startRotationDegrees,
          worldPositionInches: activeDrag.startWorldPositionInches,
        }),
      });

      set({ activeDrag: null, assemblyPlacementFeedback: null, activeObjectAlignmentGuides: [] });
    },

    cancelAssemblyRotationDrag() {
      const activeDrag = get().activeDrag;

      if (activeDrag?.kind !== "assembly-rotation") {
        set({ activeDrag: null, assemblyPlacementFeedback: null, activeObjectAlignmentGuides: [] });
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
        activeObjectAlignmentGuides: [],
      }));
    },
  };
}

function createDesignSceneWithAssemblyRotation(args: {
  designScene: DesignScene;
  assemblyId: string;
  rotationDegrees: number;
  worldPositionInches: Point3DInches;
}): DesignScene {
  return {
    ...args.designScene,
    placedAssemblies: args.designScene.placedAssemblies.map((assembly) => (
      assembly.id === args.assemblyId
        ? {
            ...updateAssemblyPlacementRotationDegrees(assembly, args.rotationDegrees),
            worldPositionInches: args.worldPositionInches,
          }
        : assembly
    )),
  };
}
