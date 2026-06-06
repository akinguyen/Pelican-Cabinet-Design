import type { AssemblyDefinition } from "./assemblyDefinitionTypes";
import { buildAssemblyFromRawDefinition } from "./buildAssemblyFromRawDefinition";
import type { RawAssemblyDefinition } from "./rawAssemblyDefinitionTypes";

export function createAssemblyDefinitionFromRaw(
  rawDefinition: RawAssemblyDefinition,
): AssemblyDefinition {
  return {
    id: rawDefinition.id,
    name: rawDefinition.name,
    catalogCategoryId: rawDefinition.catalogCategoryId,
    defaultDistanceFromFloorInches: rawDefinition.defaultDistanceFromFloorInches,
    dimensions: rawDefinition.dimensions,
    optionGroups: rawDefinition.optionGroups,
    build: (context) => buildAssemblyFromRawDefinition({ rawDefinition, context }),
  };
}
