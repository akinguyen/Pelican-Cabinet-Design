"use client";

import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { KitchenWorkspaceModeSwitch } from "./KitchenWorkspaceModeSwitch";
import { SceneViewModeTabs } from "./SceneViewModeTabs";

export function KitchenWorkspaceHeader() {
  const workspaceMode = useDesignSceneStore((state) => state.workspaceMode);

  return (
    <header className="col-start-1 row-start-1 grid h-14 grid-cols-[240px_minmax(0,1fr)_240px] items-center border-b border-slate-200 bg-white px-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight">
          {workspaceMode === "editor" ? "Kitchen Editor" : "Kitchen Designer"}
        </h1>
        <p className="text-xs text-slate-500">3D source-of-truth prototype</p>
      </div>
      <div className="justify-self-center">
        <SceneViewModeTabs />
      </div>
      <KitchenWorkspaceModeSwitch />
    </header>
  );
}
