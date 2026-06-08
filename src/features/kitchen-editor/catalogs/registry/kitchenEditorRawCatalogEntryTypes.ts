import type { RawAssemblyDefinition } from "@/engine/assemblies/raw-definition/rawAssemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "./kitchenEditorCatalogConfig";

export type KitchenEditorRawCatalogEntry = Readonly<{
  catalogId: KitchenEditorCatalogId;
  categoryId: KitchenEditorCatalogCategoryId;
  rawDefinition: RawAssemblyDefinition;
}>;
