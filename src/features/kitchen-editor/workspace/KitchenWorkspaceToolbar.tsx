"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { KitchenDesignerToolbar } from "../designer-toolbar/KitchenDesignerToolbar";
import { KitchenEditorToolbar } from "../editor-toolbar/KitchenEditorToolbar";

export function KitchenWorkspaceToolbar() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);

  return (
    <div className="col-start-1 row-start-2 min-w-0">
      {workspaceMode === "editor" ? <KitchenEditorToolbar /> : <KitchenDesignerToolbar />}
    </div>
  );
}
