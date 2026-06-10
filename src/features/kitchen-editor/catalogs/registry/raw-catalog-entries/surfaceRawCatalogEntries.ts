import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import countertopSlabRawDefinitionData from "../../data/surfaces/countertops/countertop-slab.json";

export const surfaceRawCatalogEntries = [
  {
    catalogId: "surfaces",
    categoryId: "countertops",
    rawDefinition: parseRawAssemblyDefinition(
      countertopSlabRawDefinitionData,
      "surfaces/countertops/countertop-slab.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
