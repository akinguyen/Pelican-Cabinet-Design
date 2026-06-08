"use client";

import { Box, Package, Workflow } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { KitchenEditorCatalogId } from "../catalogs/registry/kitchenEditorCatalogConfig";
import { kitchenEditorCatalogs } from "../catalogs/registry/kitchenEditorCatalogConfig";

const catalogSelectorIcons = {
  "basic-units": Box,
  cabinets: Workflow,
  appliances: Package,
} satisfies Readonly<Record<string, LucideIcon>>;

type AssemblyCatalogSelectorProps = Readonly<{
  activeCatalogId: KitchenEditorCatalogId;
  onSelectCatalog: (catalogId: KitchenEditorCatalogId) => void;
}>;

export function AssemblyCatalogSelector({ activeCatalogId, onSelectCatalog }: AssemblyCatalogSelectorProps) {
  return (
    <nav className="flex w-20 shrink-0 flex-col border-l border-slate-200 bg-white py-3">
      {kitchenEditorCatalogs.map((catalog) => {
        const Icon = catalogSelectorIcons[catalog.iconId] ?? Box;
        const isActive = catalog.id === activeCatalogId;

        return (
          <button
            key={catalog.id}
            type="button"
            className="mx-2 mb-2 rounded-xl px-2 py-3 text-center transition hover:bg-slate-100"
            onClick={() => onSelectCatalog(catalog.id)}
            aria-pressed={isActive}
          >
            <span
              className={
                isActive
                  ? "mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white"
                  : "mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-slate-500"
              }
            >
              <Icon className="h-5 w-5" strokeWidth={2} />
            </span>
            <span
              className={
                isActive
                  ? "mt-1.5 block text-[11px] font-semibold leading-4 text-slate-900"
                  : "mt-1.5 block text-[11px] font-medium leading-4 text-slate-500"
              }
            >
              {catalog.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
