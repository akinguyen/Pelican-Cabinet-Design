"use client";

import type { ChangeEvent } from "react";
import type {
  KitchenEditorCabinetCatalogId,
  KitchenEditorCatalogId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import { getKitchenEditorCabinetCatalogs } from "../catalogs/registry/kitchenEditorCatalogConfig";

type AssemblyCatalogTypeSelectProps = Readonly<{
  activeCatalogId: KitchenEditorCabinetCatalogId;
  onSelectCatalogType: (catalogId: KitchenEditorCatalogId) => void;
}>;

export function AssemblyCatalogTypeSelect({
  activeCatalogId,
  onSelectCatalogType,
}: AssemblyCatalogTypeSelectProps) {
  function handleSelectCatalogType(event: ChangeEvent<HTMLSelectElement>) {
    onSelectCatalogType(event.target.value as KitchenEditorCatalogId);
  }

  return (
    <label className="block">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Type</span>
      <select
        className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100"
        value={activeCatalogId}
        onChange={handleSelectCatalogType}
      >
        {getKitchenEditorCabinetCatalogs().map((catalog) => (
          <option key={catalog.id} value={catalog.id}>
            {catalog.label}
          </option>
        ))}
      </select>
    </label>
  );
}
