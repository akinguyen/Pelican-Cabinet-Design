"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { KitchenWorkspaceAiSidebar } from "./KitchenWorkspaceAiSidebar";
import { KitchenWorkspaceHeader } from "./KitchenWorkspaceHeader";
import { KitchenWorkspaceSidebar } from "./KitchenWorkspaceSidebar";
import { KitchenEditorToolbar } from "../editor-toolbar/KitchenEditorToolbar";

const expandedAiPanelWidthPixels = 340;
const collapsedAiPanelWidthPixels = 48;
const expandedEditorPanelWidthPixels = 320;
const collapsedEditorPanelWidthPixels = 56;

export function KitchenWorkspaceShell({ children }: Readonly<{ children: ReactNode }>) {
  const [isAiPanelCollapsed, setIsAiPanelCollapsed] = useState(false);
  const [isEditorPanelCollapsed, setIsEditorPanelCollapsed] = useState(false);
  const gridTemplateColumns = useMemo(() => {
    const aiPanelWidthPixels = isAiPanelCollapsed
      ? collapsedAiPanelWidthPixels
      : expandedAiPanelWidthPixels;
    const editorPanelWidthPixels = isEditorPanelCollapsed
      ? collapsedEditorPanelWidthPixels
      : expandedEditorPanelWidthPixels;

    return `${aiPanelWidthPixels}px minmax(0, 1fr) ${editorPanelWidthPixels}px`;
  }, [isAiPanelCollapsed, isEditorPanelCollapsed]);

  return (
    <main
      className="grid h-screen min-h-0 grid-rows-[56px_48px_minmax(0,1fr)] bg-slate-100 text-slate-950 transition-[grid-template-columns] duration-200 ease-out"
      style={{ gridTemplateColumns }}
    >
      <KitchenWorkspaceAiSidebar
        isCollapsed={isAiPanelCollapsed}
        onToggleCollapsed={() => setIsAiPanelCollapsed((isCollapsed) => !isCollapsed)}
      />
      <KitchenWorkspaceHeader />
      <div className="col-start-2 row-start-2 min-w-0">
        <KitchenEditorToolbar />
      </div>
      <section className="col-start-2 row-start-3 min-h-0 overflow-hidden">{children}</section>
      <KitchenWorkspaceSidebar
        isCollapsed={isEditorPanelCollapsed}
        onToggleCollapsed={() => setIsEditorPanelCollapsed((isCollapsed) => !isCollapsed)}
      />
    </main>
  );
}
