import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import rangeHoodRawDefinitionData from "../../data/appliances/ventilation/range-hood.json";
import refrigeratorRawDefinitionData from "../../data/appliances/refrigeration/refrigerator.json";
import builtInOvenRawDefinitionData from "../../data/appliances/cooking/built-in-oven.json";
import microwaveRawDefinitionData from "../../data/appliances/cooking/microwave.json";
import builtInDoubleOvenRawDefinitionData from "../../data/appliances/cooking/built-in-double-oven.json";
import rangeApplianceRawDefinitionData from "../../data/appliances/cooking/range-appliance.json";

export const applianceRawCatalogEntries = [
  {
    catalogId: "appliances",
    categoryId: "ventilation",
    rawDefinition: parseRawAssemblyDefinition(
      rangeHoodRawDefinitionData,
      "appliances/ventilation/range-hood.json",
    ),
  },
  {
    catalogId: "appliances",
    categoryId: "refrigeration",
    rawDefinition: parseRawAssemblyDefinition(
      refrigeratorRawDefinitionData,
      "appliances/refrigeration/refrigerator.json",
    ),
  },
  {
    catalogId: "appliances",
    categoryId: "cooking",
    rawDefinition: parseRawAssemblyDefinition(
      builtInOvenRawDefinitionData,
      "appliances/cooking/built-in-oven.json",
    ),
  },
  {
    catalogId: "appliances",
    categoryId: "cooking",
    rawDefinition: parseRawAssemblyDefinition(
      microwaveRawDefinitionData,
      "appliances/cooking/microwave.json",
    ),
  },
  {
    catalogId: "appliances",
    categoryId: "cooking",
    rawDefinition: parseRawAssemblyDefinition(
      builtInDoubleOvenRawDefinitionData,
      "appliances/cooking/built-in-double-oven.json",
    ),
  },
  {
    catalogId: "appliances",
    categoryId: "cooking",
    rawDefinition: parseRawAssemblyDefinition(
      rangeApplianceRawDefinitionData,
      "appliances/cooking/range-appliance.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
