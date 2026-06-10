import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import singleOvenCabinetRawDefinitionData from "../../data/built-in-cabinets/oven-cabinets/single-oven-cabinet.json";
import doubleOvenCabinetRawDefinitionData from "../../data/built-in-cabinets/oven-cabinets/double-oven-cabinet.json";
import microwaveCabinetRawDefinitionData from "../../data/built-in-cabinets/microwave-cabinets/microwave-cabinet.json";

export const builtInCabinetRawCatalogEntries = [
  {
    catalogId: "built-in-cabinets",
    categoryId: "oven-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      singleOvenCabinetRawDefinitionData,
      "built-in-cabinets/oven-cabinets/single-oven-cabinet.json",
    ),
  },
  {
    catalogId: "built-in-cabinets",
    categoryId: "oven-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      doubleOvenCabinetRawDefinitionData,
      "built-in-cabinets/oven-cabinets/double-oven-cabinet.json",
    ),
  },
  {
    catalogId: "built-in-cabinets",
    categoryId: "microwave-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      microwaveCabinetRawDefinitionData,
      "built-in-cabinets/microwave-cabinets/microwave-cabinet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
