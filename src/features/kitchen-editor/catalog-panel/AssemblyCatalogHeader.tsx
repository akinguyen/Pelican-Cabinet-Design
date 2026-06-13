"use client";

import type { KitchenEditorCatalog } from "../catalogs/registry/kitchenEditorCatalogConfig";
import { isKitchenEditorCabinetCatalogId } from "../catalogs/registry/kitchenEditorCatalogConfig";

type AssemblyCatalogHeaderProps = Readonly<{
  catalog: KitchenEditorCatalog;
}>;

export function AssemblyCatalogHeader({ catalog }: AssemblyCatalogHeaderProps) {
  const title = isKitchenEditorCabinetCatalogId(catalog.id) ? "Cabinets Catalog" : `${catalog.label} Catalog`;

  return (
    <header className="shrink-0">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      <div className="mt-3 h-px w-full bg-slate-200" />
    </header>
  );
}
