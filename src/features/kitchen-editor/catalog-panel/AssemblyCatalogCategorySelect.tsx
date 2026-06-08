"use client";

import type { ChangeEvent } from "react";
import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import { getKitchenEditorCatalog } from "../catalogs/registry/kitchenEditorCatalogConfig";

type AssemblyCatalogCategorySelectProps = Readonly<{
  activeCatalogId: KitchenEditorCatalogId;
  activeCategoryId: KitchenEditorCatalogCategoryId;
  onSelectCategory: (categoryId: KitchenEditorCatalogCategoryId) => void;
}>;

export function AssemblyCatalogCategorySelect({
  activeCatalogId,
  activeCategoryId,
  onSelectCategory,
}: AssemblyCatalogCategorySelectProps) {
  const catalog = getKitchenEditorCatalog(activeCatalogId);

  function handleSelectCategory(event: ChangeEvent<HTMLSelectElement>) {
    onSelectCategory(event.target.value as KitchenEditorCatalogCategoryId);
  }

  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Category</span>
      <select
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
        value={activeCategoryId}
        onChange={handleSelectCategory}
      >
        {catalog.categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.label}
          </option>
        ))}
      </select>
    </label>
  );
}
