"use client";

import type { ReactNode } from "react";
import { KitchenWorkspaceHeader } from "./KitchenWorkspaceHeader";
import { KitchenWorkspaceSidebar } from "./KitchenWorkspaceSidebar";
import { KitchenWorkspaceToolbar } from "./KitchenWorkspaceToolbar";

export function KitchenWorkspaceShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="grid h-screen min-h-0 grid-cols-[minmax(0,1fr)_360px] grid-rows-[56px_48px_minmax(0,1fr)] bg-slate-100 text-slate-950">
      <KitchenWorkspaceHeader />
      <KitchenWorkspaceToolbar />
      <section className="col-start-1 row-start-3 min-h-0 overflow-hidden">{children}</section>
      <KitchenWorkspaceSidebar />
    </main>
  );
}
