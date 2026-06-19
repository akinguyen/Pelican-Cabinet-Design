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
import { getSceneEntityRefsFromSelection } from "../sceneSelectionTypes";
import { recordDesignSceneHistoryEntry } from "./sceneHistoryActions";

export function createAssemblyEditingActions(
  get: DesignSceneStoreGetter,
  set: DesignSceneStoreSetter,
): Pick<
  DesignSceneStore,
  | "updateSelectedAssemblyWorldPositionX"
  | "updateSelectedAssemblyWorldPositionY"
  | "updateSelectedAssemblyDistanceFromFloor"
  | "updateSelectedAssemblyRotationZ"
  | "updateSelectedAssemblyDimension"
  | "updateSelectedAssemblyOptionValue"
> {
  return {
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

  const selectedAssemblyRef = getSingleSelectedPlacedAssemblyRef(activeSelection);

  if (selectedAssemblyRef === null) {
    return;
  }

  recordDesignSceneHistoryEntry({ get, set, label: "Update assembly" });

  set((state) => {
    let updatedSelectedAssembly: PlacedAssembly | undefined;
    const placedAssemblies = state.designScene.placedAssemblies.map((assembly) => {
      if (assembly.id !== selectedAssemblyRef.entityId) {
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

function getSingleSelectedPlacedAssemblyRef(activeSelection: DesignSceneStore["designScene"]["activeSelection"]): { entityKind: "placed-assembly"; entityId: string } | null {
  const selectedSceneEntities = getSceneEntityRefsFromSelection(activeSelection);

  if (selectedSceneEntities.length !== 1 || selectedSceneEntities[0].entityKind !== "placed-assembly") {
    return null;
  }

  return {
    entityKind: "placed-assembly",
    entityId: selectedSceneEntities[0].entityId,
  };
}
