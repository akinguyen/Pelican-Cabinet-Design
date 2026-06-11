import { parseRawAssemblyDefinition } from "@/engine/assemblies/raw-definition/parseRawAssemblyDefinition";
import type { KitchenEditorRawCatalogEntry } from "../kitchenEditorRawCatalogEntryTypes";

import dropInSinkRawDefinitionData from "../../data/fixtures/sinks/drop-in-sink.json";
import farmSinkRawDefinitionData from "../../data/fixtures/sinks/farm-sink.json";
import faucetRawDefinitionData from "../../data/fixtures/faucets/faucet.json";

export const fixtureRawCatalogEntries = [
  {
    catalogId: "fixtures",
    categoryId: "sinks",
    rawDefinition: parseRawAssemblyDefinition(
      dropInSinkRawDefinitionData,
      "fixtures/sinks/drop-in-sink.json",
    ),
  },
  {
    catalogId: "fixtures",
    categoryId: "sinks",
    rawDefinition: parseRawAssemblyDefinition(
      farmSinkRawDefinitionData,
      "fixtures/sinks/farm-sink.json",
    ),
  },
  {
    catalogId: "fixtures",
    categoryId: "faucets",
    rawDefinition: parseRawAssemblyDefinition(
      faucetRawDefinitionData,
      "fixtures/faucets/faucet.json",
    ),
  },
] as const satisfies readonly KitchenEditorRawCatalogEntry[];
