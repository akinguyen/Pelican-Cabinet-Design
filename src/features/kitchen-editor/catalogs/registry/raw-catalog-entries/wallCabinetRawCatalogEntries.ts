import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import oneDoorWallCabinetRawDefinitionData from "../../data/wall-cabinets/standard-wall-cabinets/one-door-wall-cabinet.json";
import twoDoorWallCabinetRawDefinitionData from "../../data/wall-cabinets/standard-wall-cabinets/two-door-wall-cabinet.json";

export const wallCabinetRawCatalogEntries = [
  {
    catalogId: "wall-cabinets",
    categoryId: "standard-wall-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneDoorWallCabinetRawDefinitionData,
      "wall-cabinets/standard-wall-cabinets/one-door-wall-cabinet.json",
    ),
  },
  {
    catalogId: "wall-cabinets",
    categoryId: "standard-wall-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDoorWallCabinetRawDefinitionData,
      "wall-cabinets/standard-wall-cabinets/two-door-wall-cabinet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
