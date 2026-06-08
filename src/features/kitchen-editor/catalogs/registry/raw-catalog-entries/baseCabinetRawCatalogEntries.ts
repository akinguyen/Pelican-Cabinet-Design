import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import oneDoorBaseCabinetRawDefinitionData from "../../data/base-cabinets/standard-base-cabinets/one-door-base-cabinet.json";
import twoDoorBaseCabinetRawDefinitionData from "../../data/base-cabinets/standard-base-cabinets/two-door-base-cabinet.json";
import oneDrawerOneDoorBaseCabinetRawDefinitionData from "../../data/base-cabinets/standard-base-cabinets/one-drawer-one-door-base-cabinet.json";
import oneDrawerTwoDoorBaseCabinetRawDefinitionData from "../../data/base-cabinets/standard-base-cabinets/one-drawer-two-door-base-cabinet.json";
import twoDrawerTwoDoorBaseCabinetRawDefinitionData from "../../data/base-cabinets/standard-base-cabinets/two-drawer-two-door-base-cabinet.json";
import twoDrawerBaseCabinetRawDefinitionData from "../../data/base-cabinets/drawer-base-cabinets/two-drawer-base-cabinet.json";
import threeDrawerBaseCabinetRawDefinitionData from "../../data/base-cabinets/drawer-base-cabinets/three-drawer-base-cabinet.json";
import leftBlindBaseCabinetRawDefinitionData from "../../data/base-cabinets/blind-base-cabinets/left-blind-base-cabinet.json";
import rightBlindBaseCabinetRawDefinitionData from "../../data/base-cabinets/blind-base-cabinets/right-blind-base-cabinet.json";
import twoDoorSinkBaseCabinetRawDefinitionData from "../../data/base-cabinets/sink-base-cabinets/two-door-sink-base-cabinet.json";
import oneFalseFrontTwoDoorSinkBaseCabinetRawDefinitionData from "../../data/base-cabinets/sink-base-cabinets/one-false-front-two-door-sink-base-cabinet.json";
import twoDoorFarmSinkBaseCabinetRawDefinitionData from "../../data/base-cabinets/sink-base-cabinets/two-door-farm-sink-base-cabinet.json";
import spiceRackPulloutBaseCabinetRawDefinitionData from "../../data/base-cabinets/pullout-rack-base-cabinets/spice-rack-pullout-base-cabinet.json";
import trashPulloutBaseCabinetRawDefinitionData from "../../data/base-cabinets/pullout-rack-base-cabinets/trash-pullout-base-cabinet.json";
import twoDoorCooktopBaseCabinetRawDefinitionData from "../../data/base-cabinets/cooktop-base-cabinets/two-door-cooktop-base-cabinet.json";
import oneFalseFrontTwoDoorCooktopBaseCabinetRawDefinitionData from "../../data/base-cabinets/cooktop-base-cabinets/one-false-front-two-door-cooktop-base-cabinet.json";
import twoDrawerCooktopBaseCabinetRawDefinitionData from "../../data/base-cabinets/cooktop-base-cabinets/two-drawer-cooktop-base-cabinet.json";
import oneFalseFrontTwoDrawerCooktopBaseCabinetRawDefinitionData from "../../data/base-cabinets/cooktop-base-cabinets/one-false-front-two-drawer-cooktop-base-cabinet.json";

export const baseCabinetRawCatalogEntries = [
  {
    catalogId: "base-cabinets",
    categoryId: "standard-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneDoorBaseCabinetRawDefinitionData,
      "base-cabinets/standard-base-cabinets/one-door-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "standard-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDoorBaseCabinetRawDefinitionData,
      "base-cabinets/standard-base-cabinets/two-door-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "standard-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneDrawerOneDoorBaseCabinetRawDefinitionData,
      "base-cabinets/standard-base-cabinets/one-drawer-one-door-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "standard-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneDrawerTwoDoorBaseCabinetRawDefinitionData,
      "base-cabinets/standard-base-cabinets/one-drawer-two-door-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "standard-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDrawerTwoDoorBaseCabinetRawDefinitionData,
      "base-cabinets/standard-base-cabinets/two-drawer-two-door-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "drawer-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDrawerBaseCabinetRawDefinitionData,
      "base-cabinets/drawer-base-cabinets/two-drawer-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "drawer-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      threeDrawerBaseCabinetRawDefinitionData,
      "base-cabinets/drawer-base-cabinets/three-drawer-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "blind-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      leftBlindBaseCabinetRawDefinitionData,
      "base-cabinets/blind-base-cabinets/left-blind-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "blind-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      rightBlindBaseCabinetRawDefinitionData,
      "base-cabinets/blind-base-cabinets/right-blind-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "sink-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDoorSinkBaseCabinetRawDefinitionData,
      "base-cabinets/sink-base-cabinets/two-door-sink-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "sink-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneFalseFrontTwoDoorSinkBaseCabinetRawDefinitionData,
      "base-cabinets/sink-base-cabinets/one-false-front-two-door-sink-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "sink-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDoorFarmSinkBaseCabinetRawDefinitionData,
      "base-cabinets/sink-base-cabinets/two-door-farm-sink-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "pullout-rack-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      spiceRackPulloutBaseCabinetRawDefinitionData,
      "base-cabinets/pullout-rack-base-cabinets/spice-rack-pullout-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "pullout-rack-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      trashPulloutBaseCabinetRawDefinitionData,
      "base-cabinets/pullout-rack-base-cabinets/trash-pullout-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "cooktop-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDoorCooktopBaseCabinetRawDefinitionData,
      "base-cabinets/cooktop-base-cabinets/two-door-cooktop-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "cooktop-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneFalseFrontTwoDoorCooktopBaseCabinetRawDefinitionData,
      "base-cabinets/cooktop-base-cabinets/one-false-front-two-door-cooktop-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "cooktop-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      twoDrawerCooktopBaseCabinetRawDefinitionData,
      "base-cabinets/cooktop-base-cabinets/two-drawer-cooktop-base-cabinet.json",
    ),
  },
  {
    catalogId: "base-cabinets",
    categoryId: "cooktop-base-cabinets",
    rawDefinition: parseRawAssemblyDefinition(
      oneFalseFrontTwoDrawerCooktopBaseCabinetRawDefinitionData,
      "base-cabinets/cooktop-base-cabinets/one-false-front-two-drawer-cooktop-base-cabinet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
