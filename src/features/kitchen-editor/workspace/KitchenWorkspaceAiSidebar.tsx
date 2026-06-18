"use client";

import { Bot } from "lucide-react";
import { KitchenAiPanel } from "../ai-panel/KitchenAiPanel";
import { WorkspacePanelCollapseButton } from "./WorkspacePanelCollapseButton";

type KitchenWorkspaceAiSidebarProps = Readonly<{
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}>;

export function KitchenWorkspaceAiSidebar({
  isCollapsed,
  onToggleCollapsed,
}: KitchenWorkspaceAiSidebarProps) {
  return (
    <aside className="col-start-1 row-start-1 row-span-3 flex min-h-0 flex-col border-r border-slate-200 bg-white">
      <div className={isCollapsed ? "flex h-full min-h-0 flex-col items-center gap-3 py-3" : "hidden"}>
        <WorkspacePanelCollapseButton
          label="Expand AI chat panel"
          title="Expand AI chat panel"
          direction="right"
          onClick={onToggleCollapsed}
        />
        <div className="flex flex-col items-center gap-2 text-slate-700">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
            <Bot className="h-5 w-5" aria-hidden="true" strokeWidth={2} />
          </span>
          <span className="text-xs font-semibold tracking-wide [writing-mode:vertical-rl]">
            AI Chat
          </span>
        </div>
      </div>
      <div className={isCollapsed ? "hidden" : "flex min-h-0 flex-1 flex-col"}>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 px-3">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-slate-950">AI Chat</h2>
            <p className="truncate text-xs text-slate-500">Assist while editing</p>
          </div>
          <WorkspacePanelCollapseButton
            label="Collapse AI chat panel"
            title="Collapse AI chat panel"
            direction="left"
            onClick={onToggleCollapsed}
          />
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">
          <KitchenAiPanel />
        </div>
      </div>
    </aside>
  );
}
