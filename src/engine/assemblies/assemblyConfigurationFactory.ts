import type { Point3DInches } from "@/core/geometry/pointTypes";
import { createId } from "@/core/ids/createId";
import type { AssemblyConfiguration, AssemblyOptionValue } from "./assemblyConfiguration";
import type { AssemblyDefinition, AssemblyOptionGroup } from "./assemblyDefinitionTypes";
import type { PlacedAssembly } from "./placedAssemblyTypes";

export function createDefaultAssemblyConfiguration(
  definition: AssemblyDefinition,
): AssemblyConfiguration {
  return {
    sizeInches: {
      widthInches: definition.dimensions.widthInches.defaultValueInches,
      depthInches: definition.dimensions.depthInches.defaultValueInches,
      heightInches: definition.dimensions.heightInches.defaultValueInches,
    },
    optionValues: createDefaultAssemblyOptionValues(definition.optionGroups),
  };
}

export function createPlacedAssemblyFromDefinition(
  definition: AssemblyDefinition,
  worldPointInches: Point3DInches,
): PlacedAssembly {
  const configuration = createDefaultAssemblyConfiguration(definition);

  return {
    id: createId(),
    definitionId: definition.id,
    configuration,
    worldPositionInches: {
      xInches: worldPointInches.xInches,
      yInches: worldPointInches.yInches,
      zInches:
        (definition.defaultDistanceFromFloorInches ?? 0) +
        configuration.sizeInches.heightInches / 2,
    },
    rotationDegrees: {
      zDegrees: 0,
    },
  };
}

function createDefaultAssemblyOptionValues(
  optionGroups: readonly AssemblyOptionGroup[],
): Readonly<Record<string, AssemblyOptionValue>> {
  const optionValues: Record<string, AssemblyOptionValue> = {};

  optionGroups.forEach((optionGroup) => {
    optionGroup.options.forEach((option) => {
      optionValues[option.id] = option.defaultValue;
    });
  });

  return optionValues;
}
