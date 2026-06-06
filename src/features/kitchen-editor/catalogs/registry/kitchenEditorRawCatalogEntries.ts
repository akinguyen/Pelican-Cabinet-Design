import type { RawAssemblyDefinition } from "@/engine/assemblies/rawAssemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "./kitchenEditorCatalogConfig";

import panelRawDefinition from "../data/basic-units/panels/panel.json";
import doorRawDefinition from "../data/basic-units/doors/door.json";
import drawerRawDefinition from "../data/basic-units/drawers/drawer.json";
import oneDrawerOneDoorBoxRawDefinition from "../data/basic-units/boxes/one-drawer-one-door-box.json";
import baseOneDoorCabinetRawDefinition from "../data/cabinets/base-cabinets/base-one-door-cabinet.json";
import baseTwoDoorCabinetRawDefinition from "../data/cabinets/base-cabinets/base-two-door-cabinet.json";
import baseOneDoorOneDrawerCabinetRawDefinition from "../data/cabinets/base-cabinets/base-one-door-one-drawer-cabinet.json";
import baseTwoDoorOneDrawerCabinetRawDefinition from "../data/cabinets/base-cabinets/base-two-door-one-drawer-cabinet.json";
import baseTwoDoorTwoDrawerCabinetRawDefinition from "../data/cabinets/base-cabinets/base-two-door-two-drawer-cabinet.json";
import baseTwoDrawerCabinetRawDefinition from "../data/cabinets/base-cabinets/base-two-drawer-cabinet.json";
import baseThreeDrawerCabinetRawDefinition from "../data/cabinets/base-cabinets/base-three-drawer-cabinet.json";
import baseFourDrawerCabinetRawDefinition from "../data/cabinets/base-cabinets/base-four-drawer-cabinet.json";
import wallOneDoorCabinetRawDefinition from "../data/cabinets/wall-cabinets/wall-one-door-cabinet.json";
import wallTwoDoorCabinetRawDefinition from "../data/cabinets/wall-cabinets/wall-two-door-cabinet.json";
import pantryOneDoorCabinetRawDefinition from "../data/cabinets/pantry-cabinets/pantry-one-door-cabinet.json";
import pantryTwoDoorCabinetRawDefinition from "../data/cabinets/pantry-cabinets/pantry-two-door-cabinet.json";

export type KitchenEditorRawCatalogEntry = Readonly<{
  catalogId: KitchenEditorCatalogId;
  categoryId: KitchenEditorCatalogCategoryId;
  rawDefinition: RawAssemblyDefinition;
}>;

export const kitchenEditorRawCatalogEntries = [
  {
    catalogId: "basic-units",
    categoryId: "panels",
    rawDefinition: panelRawDefinition,
  },
  {
    catalogId: "basic-units",
    categoryId: "doors",
    rawDefinition: doorRawDefinition,
  },
  {
    catalogId: "basic-units",
    categoryId: "drawers",
    rawDefinition: drawerRawDefinition,
  },
  {
    catalogId: "basic-units",
    categoryId: "boxes",
    rawDefinition: oneDrawerOneDoorBoxRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseOneDoorCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseTwoDoorCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseOneDoorOneDrawerCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseTwoDoorOneDrawerCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseTwoDoorTwoDrawerCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseTwoDrawerCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseThreeDrawerCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: baseFourDrawerCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "wall-cabinets",
    rawDefinition: wallOneDoorCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "wall-cabinets",
    rawDefinition: wallTwoDoorCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "pantry-cabinets",
    rawDefinition: pantryOneDoorCabinetRawDefinition,
  },
  {
    catalogId: "cabinets",
    categoryId: "pantry-cabinets",
    rawDefinition: pantryTwoDoorCabinetRawDefinition,
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
