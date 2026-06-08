"use client";

import { AssemblyCatalogPanel } from "../catalog-panel/AssemblyCatalogPanel";
import { SelectedObjectPropertiesPanel } from "./SelectedObjectPropertiesPanel";

export function KitchenEditorPanel() {
  return (
    <div className="relative flex h-full min-h-0 flex-1 overflow-hidden">
      <div className="h-full min-h-0 flex-1">
        <AssemblyCatalogPanel />
      </div>
      <SelectedObjectPropertiesPanel />
    </div>
  );
}
