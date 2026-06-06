"use client";

import type { KitchenEditorView } from "../editors/shared/editorViewTypes";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

const editorViewTabs: readonly Readonly<{ id: KitchenEditorView; label: string }>[] = [
  { id: "perspective", label: "Perspective" },
  { id: "floor-plan", label: "Floor Plan" },
  { id: "elevation", label: "Elevation" },
];

export function KitchenEditorTopBar() {
  const activeEditorView = useDesignSceneStore((state) => state.activeEditorView);
  const setActiveEditorView = useDesignSceneStore((state) => state.setActiveEditorView);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Kitchen Editor</h1>
        <p className="text-xs text-slate-500">3D source-of-truth prototype</p>
      </div>
      <nav className="flex rounded-lg border border-slate-200 bg-slate-50 p-1">
        {editorViewTabs.map((editorViewTab) => {
          const isActive = activeEditorView === editorViewTab.id;

          return (
            <button
              key={editorViewTab.id}
              type="button"
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-900"
              }`}
              onClick={() => setActiveEditorView(editorViewTab.id)}
            >
              {editorViewTab.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
