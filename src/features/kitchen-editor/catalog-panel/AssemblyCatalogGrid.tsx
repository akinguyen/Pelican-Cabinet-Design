"use client";

import type { AssemblyDefinition } from "@/engine/assemblies/assemblyDefinitionTypes";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import { kitchenEditorAssemblyCatalogEntries } from "../catalogs/registry/kitchenEditorCatalogRegistry";
import { AssemblyCatalogCard } from "./AssemblyCatalogCard";

type AssemblyCatalogGridProps = Readonly<{
  activeCatalogId: KitchenEditorCatalogId;
  activeCategoryId: KitchenEditorCatalogCategoryId;
  onSelectAssemblyDefinition: (definition: AssemblyDefinition) => void;
}>;

export function AssemblyCatalogGrid({
  activeCatalogId,
  activeCategoryId,
  onSelectAssemblyDefinition,
}: AssemblyCatalogGridProps) {
  const assemblyCatalogEntries = kitchenEditorAssemblyCatalogEntries.filter(
    (assemblyCatalogEntry) =>
      assemblyCatalogEntry.catalogId === activeCatalogId && assemblyCatalogEntry.categoryId === activeCategoryId,
  );

  if (assemblyCatalogEntries.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
        No assembly definitions are registered in this category yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {assemblyCatalogEntries.map((assemblyCatalogEntry) => (
        <AssemblyCatalogCard
          key={assemblyCatalogEntry.definition.id}
          definition={assemblyCatalogEntry.definition}
          onSelect={onSelectAssemblyDefinition}
        />
      ))}
    </div>
  );
}
