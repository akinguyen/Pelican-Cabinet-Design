"use client";

import { useState } from "react";
import type { AiAssistantMode } from "./aiAssistantModeTypes";
import { KitchenAiDevelopmentPanel } from "./KitchenAiDevelopmentPanel";
import { KitchenAiPanel } from "./KitchenAiPanel";

const AI_ASSISTANT_MODES: ReadonlyArray<{
  id: AiAssistantMode;
  label: string;
}> = [
  { id: "development", label: "Development" },
  { id: "debug", label: "Debug" },
];

export function KitchenAiAssistantModePanel() {
  const [mode, setMode] = useState<AiAssistantMode>("debug");

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50">
      <div className="shrink-0 border-b border-slate-200 bg-white p-2">
        <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1" role="tablist" aria-label="AI assistant mode">
          {AI_ASSISTANT_MODES.map((assistantMode) => {
            const isActive = mode === assistantMode.id;

            return (
              <button
                key={assistantMode.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={getModeButtonClass(isActive)}
                onClick={() => setMode(assistantMode.id)}
              >
                {assistantMode.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        <div className={mode === "debug" ? "h-full min-h-0" : "hidden h-full min-h-0"}>
          <KitchenAiPanel />
        </div>
        <div className={mode === "development" ? "h-full min-h-0" : "hidden h-full min-h-0"}>
          <KitchenAiDevelopmentPanel />
        </div>
      </div>
    </div>
  );
}

function getModeButtonClass(isActive: boolean): string {
  const baseClass = "rounded-lg px-3 py-1.5 text-xs font-semibold transition";

  if (isActive) {
    return `${baseClass} bg-white text-slate-950 shadow-sm`;
  }

  return `${baseClass} text-slate-500 hover:bg-white/70 hover:text-slate-800`;
}
