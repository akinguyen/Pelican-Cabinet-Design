"use client";

import type {
  KitchenEditorCatalogCategoryId,
  KitchenEditorCatalogId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import { getKitchenEditorCatalog } from "../catalogs/registry/kitchenEditorCatalogConfig";

type AssemblyCatalogCategoryTabsProps = Readonly<{
  activeCatalogId: KitchenEditorCatalogId;
  activeCategoryId: KitchenEditorCatalogCategoryId;
  onSelectCategory: (categoryId: KitchenEditorCatalogCategoryId) => void;
}>;

export function AssemblyCatalogCategoryTabs({
  activeCatalogId,
  activeCategoryId,
  onSelectCategory,
}: AssemblyCatalogCategoryTabsProps) {
  const catalog = getKitchenEditorCatalog(activeCatalogId);

  return (
    <div className="grid grid-cols-2 gap-2">
      {catalog.categories.map((category) => {
        const isActive = category.id === activeCategoryId;

        return (
          <button
            key={category.id}
            type="button"
            className={
              isActive
                ? "rounded-lg bg-cyan-100 px-3 py-2 text-sm font-semibold text-slate-950 shadow-sm"
                : "rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-200"
            }
            onClick={() => onSelectCategory(category.id)}
            aria-pressed={isActive}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
