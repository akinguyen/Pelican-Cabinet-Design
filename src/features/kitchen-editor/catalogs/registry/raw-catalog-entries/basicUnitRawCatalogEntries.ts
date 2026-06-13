import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import panelRawDefinitionData from "../../data/basic-units/panels/panel.json";
import fillerRawDefinitionData from "../../data/basic-units/fillers/filler.json";
import doorRawDefinitionData from "../../data/basic-units/doors/door.json";
import drawerRawDefinitionData from "../../data/basic-units/drawers/drawer.json";

export const basicUnitRawCatalogEntries = [
  {
    catalogId: "basic-units",
    categoryId: "panels",
    rawDefinition: parseRawAssemblyDefinition(
      panelRawDefinitionData,
      "basic-units/panels/panel.json",
    ),
  },
  {
    catalogId: "basic-units",
    categoryId: "fillers",
    rawDefinition: parseRawAssemblyDefinition(
      fillerRawDefinitionData,
      "basic-units/fillers/filler.json",
    ),
  },
  {
    rawDefinition: parseRawAssemblyDefinition(
      doorRawDefinitionData,
      "basic-units/doors/door.json",
    ),
  },
  {
    rawDefinition: parseRawAssemblyDefinition(
      drawerRawDefinitionData,
      "basic-units/drawers/drawer.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
