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
  | "updateSelectedAssemblyWorldPositionX"
  | "updateSelectedAssemblyWorldPositionY"
  | "updateSelectedAssemblyDistanceFromFloor"
  | "updateSelectedAssemblyRotationZ"
  | "updateSelectedAssemblyDimension"
  | "updateSelectedAssemblyOptionValue"
> {
  return {
    deleteSelectedAssembly() {
      if (get().workspaceMode !== "editor") {
        return;
      }

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
  if (get().workspaceMode !== "editor") {
    return;
  }

  const activeSelection = get().designScene.activeSelection;

  if (activeSelection?.kind !== "placed-assembly") {
    return;
  }

  set((state) => ({
    designScene: {
      ...state.designScene,
      placedAssemblies: state.designScene.placedAssemblies.map((assembly) =>
        assembly.id === activeSelection.placedAssemblyId ? updateAssembly(assembly) : assembly,
      ),
    },
  }));
}
