import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import panelRawDefinitionData from "../../data/basic-units/panels/panel.json";
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
    categoryId: "doors",
    rawDefinition: parseRawAssemblyDefinition(
      doorRawDefinitionData,
      "basic-units/doors/door.json",
    ),
  },
  {
    catalogId: "basic-units",
    categoryId: "drawers",
    rawDefinition: parseRawAssemblyDefinition(
      drawerRawDefinitionData,
      "basic-units/drawers/drawer.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
