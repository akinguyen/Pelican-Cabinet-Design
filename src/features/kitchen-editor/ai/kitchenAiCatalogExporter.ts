import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import { kitchenEditorAssemblyCatalogEntries } from "../catalogs/registry/loadKitchenEditorRawDefinitions";
import type { KitchenAiCatalogItem } from "./kitchenAiTypes";

const allowedAiCatalogIds = new Set(["base-cabinets", "wall-cabinets", "pantry-cabinets", "built-in-cabinets"]);
const disallowedDefinitionIdFragments = [
  "filler",
  "panel",
  "countertop",
  "refrigerator",
  "range-appliance",
  "dishwasher",
  "faucet",
  "cooktop",
  "oven",
  "microwave",
  "hood",
  "left-blind",
  "right-blind",
  "lazy-susan",
];

export function buildKitchenAiCatalogItems(): readonly KitchenAiCatalogItem[] {
  return kitchenEditorAssemblyCatalogEntries.flatMap((entry) => {
    if (!allowedAiCatalogIds.has(entry.catalogId)) {
      return [];
    }

    if (isDefinitionDisallowed(entry.definition)) {
      return [];
    }

    return [
      {
        definitionId: entry.definition.id,
        label: entry.definition.name,
        catalogId: entry.catalogId,
        categoryId: entry.categoryId,
        semanticRole: deriveCatalogSemanticRole(entry.categoryId, entry.definition.id),
        defaultSizeInches: {
          widthInches: entry.definition.dimensions.widthInches.defaultValueInches,
          depthInches: entry.definition.dimensions.depthInches.defaultValueInches,
          heightInches: entry.definition.dimensions.heightInches.defaultValueInches,
        },
        allowedWidthsInches: entry.definition.dimensions.widthInches.optionsInches?.map((option) => option.valueInches) ?? [
          entry.definition.dimensions.widthInches.defaultValueInches,
        ],
        canUseCustomWidth: false,
        defaultDistanceFromFloorInches: entry.definition.defaultDistanceFromFloorInches ?? 0,
      },
    ];
  });
}

function isDefinitionDisallowed(definition: AssemblyDefinition): boolean {
  const normalizedId = definition.id.toLowerCase();

  return disallowedDefinitionIdFragments.some((fragment) => normalizedId.includes(fragment));
}

function deriveCatalogSemanticRole(categoryId: string, definitionId: string): string {
  if (categoryId.includes("drawer")) return "drawer-base-cabinet";
  if (categoryId.includes("wall")) return "wall-cabinet";
  if (categoryId.includes("pantry")) return "pantry-cabinet";
  if (categoryId.includes("base")) return "base-cabinet";
  if (definitionId.includes("cabinet")) return "cabinet";

  return "storage-cabinet";
}
