import { createAssemblyDefinitionFromRaw } from "@/engine/assemblies/raw-definition/createAssemblyDefinitionFromRaw";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "./kitchenEditorCatalogConfig";
import { kitchenEditorRawCatalogEntries } from "./kitchenEditorRawCatalogEntries";
import { isKitchenEditorVisibleRawCatalogEntry } from "./kitchenEditorRawCatalogEntryTypes";

export type KitchenEditorAssemblyCatalogEntry = Readonly<{
  catalogId: KitchenEditorCatalogId;
  categoryId: KitchenEditorCatalogCategoryId;
  definition: AssemblyDefinition;
}>;

const kitchenEditorRawDefinitionEntries = kitchenEditorRawCatalogEntries.map((rawCatalogEntry) => ({
  rawCatalogEntry,
  definition: createAssemblyDefinitionFromRaw(rawCatalogEntry.rawDefinition),
}));

export const kitchenEditorDefinitions = kitchenEditorRawDefinitionEntries.map(
  (rawDefinitionEntry) => rawDefinitionEntry.definition,
);

export const kitchenEditorAssemblyCatalogEntries = kitchenEditorRawDefinitionEntries.flatMap(
  (rawDefinitionEntry) => {
    if (!isKitchenEditorVisibleRawCatalogEntry(rawDefinitionEntry.rawCatalogEntry)) {
      return [];
    }

    return [
      {
        catalogId: rawDefinitionEntry.rawCatalogEntry.catalogId,
        categoryId: rawDefinitionEntry.rawCatalogEntry.categoryId,
        definition: rawDefinitionEntry.definition,
      },
    ];
  },
) satisfies readonly KitchenEditorAssemblyCatalogEntry[];
