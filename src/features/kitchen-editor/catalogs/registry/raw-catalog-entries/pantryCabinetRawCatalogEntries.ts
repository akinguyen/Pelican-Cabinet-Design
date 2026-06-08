import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import oneDoorPantryCabinetRawDefinitionData from "../../data/pantry-cabinets/standard-pantry-cabinets/one-door-pantry-cabinet.json";
import twoDoorPantryCabinetRawDefinitionData from "../../data/pantry-cabinets/standard-pantry-cabinets/two-door-pantry-cabinet.json";

export const pantryCabinetRawCatalogEntries = [
  {
    catalogId: "pantry-cabinets",
    categoryId: "standard-pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneDoorPantryCabinetRawDefinitionData,
      "pantry-cabinets/standard-pantry-cabinets/one-door-pantry-cabinet.json",
    ),
  },
  {
    catalogId: "pantry-cabinets",
    categoryId: "standard-pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDoorPantryCabinetRawDefinitionData,
      "pantry-cabinets/standard-pantry-cabinets/two-door-pantry-cabinet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
