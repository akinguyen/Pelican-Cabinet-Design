import type { RawAssemblyDefinition } from "@/engine/assemblies/raw-definition/rawAssemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "./kitchenEditorCatalogConfig";

export type KitchenEditorVisibleRawCatalogEntry = Readonly<{
  catalogId: KitchenEditorCatalogId;
  categoryId: KitchenEditorCatalogCategoryId;
  rawDefinition: RawAssemblyDefinition;
}>;

export type KitchenEditorInternalRawCatalogEntry = Readonly<{
  rawDefinition: RawAssemblyDefinition;
}>;

export type KitchenEditorRawCatalogEntry =
  | KitchenEditorVisibleRawCatalogEntry
  | KitchenEditorInternalRawCatalogEntry;

export function isKitchenEditorVisibleRawCatalogEntry(
  catalogEntry: KitchenEditorRawCatalogEntry,
): catalogEntry is KitchenEditorVisibleRawCatalogEntry {
  return "catalogId" in catalogEntry && "categoryId" in catalogEntry;
}
