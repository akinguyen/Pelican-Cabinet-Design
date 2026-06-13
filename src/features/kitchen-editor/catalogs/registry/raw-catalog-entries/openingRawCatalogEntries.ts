import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import wallDoorRawDefinitionData from "../../data/openings/doors/wall-door.json";
import wallWindowRawDefinitionData from "../../data/openings/windows/wall-window.json";

export const openingRawCatalogEntries = [
  {
    catalogId: "openings",
    categoryId: "doors",
    rawDefinition: parseRawAssemblyDefinition(
      wallDoorRawDefinitionData,
      "openings/doors/wall-door.json",
    ),
  },
  {
    catalogId: "openings",
    categoryId: "windows",
    rawDefinition: parseRawAssemblyDefinition(
      wallWindowRawDefinitionData,
      "openings/windows/wall-window.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
