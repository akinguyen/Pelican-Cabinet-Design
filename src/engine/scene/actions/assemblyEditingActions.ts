import { createId } from "@/core/ids/createId";
import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import {
  updateAssemblyDistanceFromFloor,
  updateAssemblyHeightPreservingDistanceFromFloor,
} from "@/engine/assemblies/placedAssemblyTypes";
import type {
  AssemblyDimensionId,
  DesignSceneStore,
  DesignSceneStoreGetter,
  DesignSceneStoreSetter,
} from "../designSceneStoreTypes";

export function createAssemblyEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "deleteSelectedAssembly"
  | "duplicateSelectedAssembly"
  | "updateSelectedAssemblyWorldPositionX"
  | "updateSelectedAssemblyWorldPositionY"
  | "updateSelectedAssemblyDistanceFromFloor"
  | "updateSelectedAssemblyRotationZ"
  | "updateSelectedAssemblyDimension"
  | "updateSelectedAssemblyOptionValue"
> {
  return {
    deleteSelectedAssembly() {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-assembly") {
        return;
      }

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: state.designScene.placedAssemblies.filter(
            (assembly) => assembly.id !== activeSelection.placedAssemblyId,
          ),
          activeSelection: null,
        },
        activeDrag: null,
        assemblyPlacementFeedback: null,
      }));
    },

    duplicateSelectedAssembly() {
      const activeSelection = get().designScene.activeSelection;

      if (activeSelection?.kind !== "placed-assembly") {
        return;
      }

      const selectedAssembly = get().designScene.placedAssemblies.find(
        (assembly) => assembly.id === activeSelection.placedAssemblyId,
      );

      if (selectedAssembly === undefined) {
        return;
      }

      const duplicatedAssemblyId = createId();
      const duplicatedAssembly: PlacedAssembly = {
        ...selectedAssembly,
        id: duplicatedAssemblyId,
        worldPositionInches: {
          ...selectedAssembly.worldPositionInches,
          xInches: selectedAssembly.worldPositionInches.xInches + 12,
          yInches: selectedAssembly.worldPositionInches.yInches + 12,
        },
      };

      set((state) => ({
        designScene: {
          ...state.designScene,
          placedAssemblies: [...state.designScene.placedAssemblies, duplicatedAssembly],
          activeSelection: {
            kind: "placed-assembly",
            placedAssemblyId: duplicatedAssemblyId,
          },
        },
        activeDrag: null,
        assemblyPlacementFeedback: null,
      }));
    },

    updateSelectedAssemblyWorldPositionX(xInches) {
      updateSelectedAssembly((assembly) => ({
        ...assembly,
        worldPositionInches: {
          ...assembly.worldPositionInches,
          xInches,
        },
      }), get, set);
    },

    updateSelectedAssemblyWorldPositionY(yInches) {
      updateSelectedAssembly((assembly) => ({
        ...assembly,
        worldPositionInches: {
          ...assembly.worldPositionInches,
          yInches,
        },
      }), get, set);
    },

    updateSelectedAssemblyDistanceFromFloor(distanceFromFloorInches) {
      updateSelectedAssembly(
        (assembly) => updateAssemblyDistanceFromFloor(assembly, distanceFromFloorInches),
        get,
        set,
      );
    },

    updateSelectedAssemblyRotationZ(zDegrees) {
      updateSelectedAssembly((assembly) => ({
        ...assembly,
        rotationDegrees: {
          zDegrees,
        },
      }), get, set);
    },

    updateSelectedAssemblyDimension(dimensionId, valueInches) {
      updateSelectedAssembly((assembly) => updateAssemblyDimension(
        assembly,
        dimensionId,
        valueInches,
      ), get, set);
    },

    updateSelectedAssemblyOptionValue(optionId, value) {
      updateSelectedAssembly((assembly) => updateAssemblyOptionValue(
        assembly,
        optionId,
        value,
      ), get, set);
    },
  };
}

function updateAssemblyDimension(
  assembly: PlacedAssembly,
  dimensionId: AssemblyDimensionId,
  valueInches: number,
): PlacedAssembly {
  if (dimensionId === "heightInches") {
    return updateAssemblyHeightPreservingDistanceFromFloor(assembly, valueInches);
  }

  return {
    ...assembly,
    configuration: {
      ...assembly.configuration,
      sizeInches: {
        ...assembly.configuration.sizeInches,
        [dimensionId]: valueInches,
      },
    },
  };
}

function updateAssemblyOptionValue(
  assembly: PlacedAssembly,
  optionId: string,
  value: AssemblyOptionValue,
): PlacedAssembly {
  return {
    ...assembly,
    configuration: {
      ...assembly.configuration,
      optionValues: {
        ...assembly.configuration.optionValues,
        [optionId]: value,
      },
    },
  };
}

function updateSelectedAssembly(
  updateAssembly: (assembly: PlacedAssembly) => PlacedAssembly,
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): void {
  const activeSelection = get().designScene.activeSelection;

  if (activeSelection?.kind !== "placed-assembly") {
    return;
  }

  set((state) => {
    let updatedSelectedAssembly: PlacedAssembly | undefined;
    const placedAssemblies = state.designScene.placedAssemblies.map((assembly) => {
      if (assembly.id !== activeSelection.placedAssemblyId) {
        return assembly;
      }

      updatedSelectedAssembly = updateAssembly(assembly);
      return updatedSelectedAssembly;
    });
    return {
      designScene: {
        ...state.designScene,
        placedAssemblies,
      },
    };
  });
}
