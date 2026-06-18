"use client";

import { SceneViewModeTabs } from "./SceneViewModeTabs";

export function KitchenWorkspaceHeader() {
  return (
    <header className="col-start-2 row-start-1 grid h-14 grid-cols-[220px_minmax(0,1fr)_220px] items-center border-b border-slate-200 bg-white px-4">
      <div>
        <h1 className="text-base font-semibold tracking-tight">Kitchen Editor</h1>
        <p className="text-xs text-slate-500">3D source-of-truth prototype</p>
      </div>
      <div className="justify-self-center">
        <SceneViewModeTabs />
      </div>
      <div aria-hidden="true" />
    </header>
  );
}
