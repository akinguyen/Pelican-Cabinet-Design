import { createAssemblyDefinitionFromRaw } from "@/engine/assemblies/createAssemblyDefinitionFromRaw";
import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "./kitchenEditorCatalogConfig";
import { kitchenEditorRawCatalogEntries } from "./kitchenEditorRawCatalogEntries";

export type KitchenEditorAssemblyCatalogEntry = Readonly<{
  catalogId: KitchenEditorCatalogId;
  categoryId: KitchenEditorCatalogCategoryId;
  definition: AssemblyDefinition;
}>;

export const kitchenEditorAssemblyCatalogEntries = kitchenEditorRawCatalogEntries.map((assemblyCatalogEntry) => ({
  catalogId: assemblyCatalogEntry.catalogId,
  categoryId: assemblyCatalogEntry.categoryId,
  definition: createAssemblyDefinitionFromRaw(assemblyCatalogEntry.rawDefinition),
})) satisfies readonly KitchenEditorAssemblyCatalogEntry[];

export const kitchenEditorDefinitions = kitchenEditorAssemblyCatalogEntries.map(
  (assemblyCatalogEntry) => assemblyCatalogEntry.definition,
);
