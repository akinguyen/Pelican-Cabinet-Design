import { kitchenEditorAssemblyCatalogEntries } from "../catalogs/registry/loadKitchenEditorRawDefinitions";
import type {
  KitchenAiDevelopmentCatalogItem,
  KitchenAiDevelopmentCatalogItemKind,
} from "./kitchenAiPreDesignedTypes";

const supportedDevelopmentCatalogIds = new Set([
  "base-cabinets",
  "wall-cabinets",
  "pantry-cabinets",
  "built-in-cabinets",
  "surfaces",
  "appliances",
  "fixtures",
]);

export function buildKitchenAiDevelopmentCatalogItems(): readonly KitchenAiDevelopmentCatalogItem[] {
  return kitchenEditorAssemblyCatalogEntries.flatMap((entry) => {
    if (!supportedDevelopmentCatalogIds.has(entry.catalogId)) {
      return [];
    }

    const itemKind = getCatalogItemKind(entry.catalogId);

    if (itemKind === null) {
      return [];
    }

    return [
      {
        definitionId: entry.definition.id,
        label: entry.definition.name,
        catalogId: entry.catalogId,
        categoryId: entry.categoryId,
        semanticRole: deriveDevelopmentCatalogSemanticRole(entry.catalogId, entry.categoryId, entry.definition.id),
        itemKind,
        defaultSizeInches: {
          widthInches: entry.definition.dimensions.widthInches.defaultValueInches,
          depthInches: entry.definition.dimensions.depthInches.defaultValueInches,
          heightInches: entry.definition.dimensions.heightInches.defaultValueInches,
        },
        allowedWidthsInches: entry.definition.dimensions.widthInches.optionsInches?.map((option) => option.valueInches) ?? [
          entry.definition.dimensions.widthInches.defaultValueInches,
        ],
        canUseCustomWidth: entry.definition.dimensions.widthInches.allowCustomValue ?? false,
        defaultDistanceFromFloorInches: entry.definition.defaultDistanceFromFloorInches ?? 0,
      },
    ];
  });
}

function getCatalogItemKind(catalogId: string): KitchenAiDevelopmentCatalogItemKind | null {
  if (catalogId === "base-cabinets" || catalogId === "wall-cabinets" || catalogId === "pantry-cabinets" || catalogId === "built-in-cabinets") return "cabinet";
  if (catalogId === "surfaces") return "surface";
  if (catalogId === "appliances") return "appliance";
  if (catalogId === "fixtures") return "fixture";

  return null;
}

function deriveDevelopmentCatalogSemanticRole(
  catalogId: string,
  categoryId: string,
  definitionId: string,
): string {
  const normalizedCatalogId = catalogId.toLowerCase();
  const normalizedCategoryId = categoryId.toLowerCase();
  const normalizedDefinitionId = definitionId.toLowerCase();

  if (normalizedCatalogId === "surfaces" || normalizedDefinitionId.includes("countertop")) return "countertop";
  if (normalizedDefinitionId.includes("refrigerator")) return "refrigerator";
  if (normalizedDefinitionId.includes("dishwasher")) return "dishwasher";
  if (normalizedDefinitionId.includes("range-hood") || normalizedDefinitionId.includes("hood")) return "range-hood";
  if (normalizedDefinitionId.includes("cooktop") || normalizedDefinitionId.includes("rangetop")) return "cooktop";
  if (normalizedDefinitionId.includes("range")) return "range-appliance";
  if (normalizedDefinitionId.includes("oven")) return "oven";
  if (normalizedDefinitionId.includes("microwave")) return "microwave";
  if (normalizedDefinitionId.includes("sink")) return "sink";
  if (normalizedDefinitionId.includes("faucet")) return "faucet";
  if (normalizedCategoryId.includes("drawer")) return "drawer-base-cabinet";
  if (normalizedCategoryId.includes("wall")) return "wall-cabinet";
  if (normalizedCategoryId.includes("pantry")) return "pantry-cabinet";
  if (normalizedCategoryId.includes("base")) return "base-cabinet";
  if (normalizedDefinitionId.includes("cabinet")) return "cabinet";

  return "kitchen-object";
}
