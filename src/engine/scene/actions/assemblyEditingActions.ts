import type { AssemblyOptionValue } from "@/engine/assemblies/assemblyConfiguration";
import type { PlacedAssembly } from "@/engine/assemblies/placedAssemblyTypes";
import { fitCountertopOpeningToHost } from "@/engine/countertops/countertopOpeningValidation";
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
import { canManuallyEditScene } from "../kitchenWorkspaceModePermissions";

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
      if (!canManuallyEditScene(get().workspaceMode)) {
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
          countertopOpenings: state.designScene.countertopOpenings.filter(
            (opening) => opening.hostCountertopId !== activeSelection.placedAssemblyId,
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
  if (!canManuallyEditScene(get().workspaceMode)) {
    return;
  }

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
    const updatedSelectedAssemblySizeInches = updatedSelectedAssembly?.configuration.sizeInches;

    return {
      designScene: {
        ...state.designScene,
        placedAssemblies,
        countertopOpenings:
          updatedSelectedAssemblySizeInches === undefined
            ? state.designScene.countertopOpenings
            : state.designScene.countertopOpenings.map((opening) =>
                opening.hostCountertopId === activeSelection.placedAssemblyId
                  ? fitCountertopOpeningToHost(opening, updatedSelectedAssemblySizeInches)
                  : opening,
              ),
      },
    };
  });
}
