"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";

export function KitchenWorkspaceModeSwitch() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);
  const setWorkspaceMode = useDesignSceneStore((state) => state.setWorkspaceMode);
  const nextWorkspaceMode = workspaceMode === "editor" ? "designer" : "editor";

  return (
    <button
      type="button"
      className="justify-self-end rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
      onClick={() => setWorkspaceMode(nextWorkspaceMode)}
    >
      {workspaceMode === "editor" ? "Switch to Designer" : "Switch to Editor"}
    </button>
  );
}
