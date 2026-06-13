"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { AIDesignerPanel } from "../designer-panel/AIDesignerPanel";
import { KitchenEditorPanel } from "../editor-panel/KitchenEditorPanel";

export function KitchenWorkspaceSidebar() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);

  return (
    <aside className="col-start-2 row-start-1 row-span-3 flex min-h-0 w-[360px] flex-col border-l border-slate-200 bg-white">
      {workspaceMode === "editor" ? <KitchenEditorPanel /> : <AIDesignerPanel />}
    </aside>
  );
}
