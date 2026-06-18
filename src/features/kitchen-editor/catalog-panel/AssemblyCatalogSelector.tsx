"use client";

import { Archive, Box, DoorOpen, Package, Puzzle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  KitchenEditorCatalogId,
  KitchenEditorCatalogSelectorItemId,
} from "../catalogs/registry/kitchenEditorCatalogConfig";
import {
  getKitchenEditorCatalogSelectorItemForCatalogId,
  kitchenEditorCatalogSelectorItems,
} from "../catalogs/registry/kitchenEditorCatalogConfig";

const catalogSelectorIcons = {
  "basic-units": Box,
  cabinets: Archive,
  appliances: Package,
  fixtures: Puzzle,
  surfaces: Box,
  openings: DoorOpen,
} satisfies Readonly<Record<string, LucideIcon>>;

type AssemblyCatalogSelectorProps = Readonly<{
  activeCatalogId: KitchenEditorCatalogId;
  onSelectCatalogGroup: (selectorItemId: KitchenEditorCatalogSelectorItemId) => void;
}>;

export function AssemblyCatalogSelector({ activeCatalogId, onSelectCatalogGroup }: AssemblyCatalogSelectorProps) {
  const activeSelectorItem = getKitchenEditorCatalogSelectorItemForCatalogId(activeCatalogId);

  return (
    <nav className="flex w-[68px] shrink-0 flex-col border-l border-slate-200 bg-white py-3">
      {kitchenEditorCatalogSelectorItems.map((selectorItem) => {
        const Icon = catalogSelectorIcons[selectorItem.iconId] ?? Box;
        const isActive = selectorItem.id === activeSelectorItem.id;

        return (
          <button
            key={selectorItem.id}
            type="button"
            className="mx-1.5 mb-2 rounded-xl px-1.5 py-3 text-center transition hover:bg-slate-100"
            onClick={() => onSelectCatalogGroup(selectorItem.id)}
            aria-pressed={isActive}
          >
            <span
              className={
                isActive
                  ? "mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white"
                  : "mx-auto flex h-9 w-9 items-center justify-center rounded-xl text-slate-500"
              }
            >
              <Icon className="h-4 w-4" strokeWidth={2} />
            </span>
            <span
              className={
                isActive
                  ? "mt-1.5 block text-[10px] font-semibold leading-4 text-slate-900"
                  : "mt-1.5 block text-[10px] font-medium leading-4 text-slate-500"
              }
            >
              {selectorItem.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
