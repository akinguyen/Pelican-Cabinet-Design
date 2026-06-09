import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import baseOneDoorPantryCabinetRawDefinitionData from "../../data/pantry-cabinets/base-pantry-cabinets/base-one-door-pantry-cabinet.json";
import baseTwoDoorPantryCabinetRawDefinitionData from "../../data/pantry-cabinets/base-pantry-cabinets/base-two-door-pantry-cabinet.json";
import wallOneDoorPantryCabinetRawDefinitionData from "../../data/pantry-cabinets/wall-pantry-cabinets/wall-one-door-pantry-cabinet.json";
import wallTwoDoorPantryCabinetRawDefinitionData from "../../data/pantry-cabinets/wall-pantry-cabinets/wall-two-door-pantry-cabinet.json";

export const pantryCabinetRawCatalogEntries = [
  {
    catalogId: "pantry-cabinets",
    categoryId: "base-pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseOneDoorPantryCabinetRawDefinitionData,
      "pantry-cabinets/base-pantry-cabinets/base-one-door-pantry-cabinet.json",
    ),
  },
  {
    catalogId: "pantry-cabinets",
    categoryId: "base-pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseTwoDoorPantryCabinetRawDefinitionData,
      "pantry-cabinets/base-pantry-cabinets/base-two-door-pantry-cabinet.json",
    ),
  },
  {
    catalogId: "pantry-cabinets",
    categoryId: "wall-pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      wallOneDoorPantryCabinetRawDefinitionData,
      "pantry-cabinets/wall-pantry-cabinets/wall-one-door-pantry-cabinet.json",
    ),
  },
  {
    catalogId: "pantry-cabinets",
    categoryId: "wall-pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      wallTwoDoorPantryCabinetRawDefinitionData,
      "pantry-cabinets/wall-pantry-cabinets/wall-two-door-pantry-cabinet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
