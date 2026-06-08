import type { RawAssemblyDefinition } from "@/engine/assemblies/rawAssemblyDefinitionTypes";
import { parseComponents } from "./parseRawAssemblyComponents";
import { parseDimensions, parseOptionGroups } from "./parseRawAssemblyOptions";
import {
  assertKnownKeys,
  readOptionalNumber,
  readRecord,
  readString,
} from "./rawAssemblyReadHelpers";

export function parseRawAssemblyDefinition(
  rawDefinitionData: unknown,
  sourceLabel: string,
): RawAssemblyDefinition {
  const rawDefinition = readRecord(rawDefinitionData, sourceLabel, "definition");
  assertKnownKeys(rawDefinition, sourceLabel, "definition", [
    "id",
    "name",
    "catalogCategoryId",
    "defaultDistanceFromFloorInches",
    "dimensions",
    "optionGroups",
    "components",
  ]);

  const defaultDistanceFromFloorInches = readOptionalNumber(
    rawDefinition,
    sourceLabel,
    "definition.defaultDistanceFromFloorInches",
  );

  return {
    id: readString(rawDefinition, sourceLabel, "definition.id"),
    name: readString(rawDefinition, sourceLabel, "definition.name"),
    catalogCategoryId: readString(
      rawDefinition,
      sourceLabel,
      "definition.catalogCategoryId",
    ),
    ...(defaultDistanceFromFloorInches === undefined
      ? {}
      : { defaultDistanceFromFloorInches }),
    dimensions: parseDimensions(
      rawDefinition.dimensions,
      sourceLabel,
      "definition.dimensions",
    ),
    optionGroups: parseOptionGroups(
      rawDefinition.optionGroups,
      sourceLabel,
      "definition.optionGroups",
    ),
    components: parseComponents(
      rawDefinition.components,
      sourceLabel,
      "definition.components",
    ),
  };
}
