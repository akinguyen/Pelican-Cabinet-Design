"use client";

import type { ReactNode } from "react";
import { EditorToolbar } from "../editor-toolbar/EditorToolbar";
import { KitchenEditorInspectorPanel } from "./KitchenEditorInspectorPanel";
import { KitchenEditorTopBar } from "./KitchenEditorTopBar";

export function KitchenEditorShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="flex h-screen min-h-0 flex-col bg-slate-100 text-slate-950">
      <KitchenEditorTopBar />
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <EditorToolbar />
          <section className="min-h-0 flex-1 overflow-hidden">{children}</section>
        </div>
        <KitchenEditorInspectorPanel />
      </div>
    </main>
  );
}
