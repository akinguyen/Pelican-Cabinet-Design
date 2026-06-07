import { parseRawAssemblyDefinition } from "@/engine/assemblies/parseRawAssemblyDefinition";
import type { RawAssemblyDefinition } from "@/engine/assemblies/rawAssemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "./kitchenEditorCatalogConfig";

import panelRawDefinitionData from "../data/basic-units/panels/panel.json";
import doorRawDefinitionData from "../data/basic-units/doors/door.json";
import drawerRawDefinitionData from "../data/basic-units/drawers/drawer.json";
import oneDrawerOneDoorBoxRawDefinitionData from "../data/basic-units/boxes/one-drawer-one-door-box.json";
import baseOneDoorCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-one-door-cabinet.json";
import baseTwoDoorCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-two-door-cabinet.json";
import baseOneDoorOneDrawerCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-one-door-one-drawer-cabinet.json";
import baseTwoDoorOneDrawerCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-two-door-one-drawer-cabinet.json";
import baseTwoDoorTwoDrawerCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-two-door-two-drawer-cabinet.json";
import baseTwoDrawerCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-two-drawer-cabinet.json";
import baseThreeDrawerCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-three-drawer-cabinet.json";
import baseFourDrawerCabinetRawDefinitionData from "../data/cabinets/base-cabinets/base-four-drawer-cabinet.json";
import wallOneDoorCabinetRawDefinitionData from "../data/cabinets/wall-cabinets/wall-one-door-cabinet.json";
import wallTwoDoorCabinetRawDefinitionData from "../data/cabinets/wall-cabinets/wall-two-door-cabinet.json";
import pantryOneDoorCabinetRawDefinitionData from "../data/cabinets/pantry-cabinets/pantry-one-door-cabinet.json";
import pantryTwoDoorCabinetRawDefinitionData from "../data/cabinets/pantry-cabinets/pantry-two-door-cabinet.json";

export type KitchenEditorRawCatalogEntry = Readonly<{
  catalogId: KitchenEditorCatalogId;
  categoryId: KitchenEditorCatalogCategoryId;
  rawDefinition: RawAssemblyDefinition;
}>;

export const kitchenEditorRawCatalogEntries = [
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
  {
    catalogId: "basic-units",
    categoryId: "boxes",
    rawDefinition: parseRawAssemblyDefinition(
      oneDrawerOneDoorBoxRawDefinitionData,
      "basic-units/boxes/one-drawer-one-door-box.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseOneDoorCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-one-door-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseTwoDoorCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-two-door-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseOneDoorOneDrawerCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-one-door-one-drawer-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseTwoDoorOneDrawerCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-two-door-one-drawer-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseTwoDoorTwoDrawerCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-two-door-two-drawer-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseTwoDrawerCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-two-drawer-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseThreeDrawerCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-three-drawer-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      baseFourDrawerCabinetRawDefinitionData,
      "cabinets/base-cabinets/base-four-drawer-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "wall-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      wallOneDoorCabinetRawDefinitionData,
      "cabinets/wall-cabinets/wall-one-door-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "wall-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      wallTwoDoorCabinetRawDefinitionData,
      "cabinets/wall-cabinets/wall-two-door-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      pantryOneDoorCabinetRawDefinitionData,
      "cabinets/pantry-cabinets/pantry-one-door-cabinet.json",
    ),
  },
  {
    catalogId: "cabinets",
    categoryId: "pantry-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      pantryTwoDoorCabinetRawDefinitionData,
      "cabinets/pantry-cabinets/pantry-two-door-cabinet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
