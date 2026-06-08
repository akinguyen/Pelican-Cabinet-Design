"use client";

import type { KitchenEditorCatalog } from "../catalogs/registry/kitchenEditorCatalogConfig";

type AssemblyCatalogHeaderProps = Readonly<{
  catalog: KitchenEditorCatalog;
}>;

export function AssemblyCatalogHeader({ catalog }: AssemblyCatalogHeaderProps) {
  return (
    <header className="shrink-0">
      <h2 className="text-base font-semibold text-slate-950">{catalog.label} Catalog</h2>
      <div className="mt-3 h-px w-full bg-slate-200" />
    </header>
  );
}
