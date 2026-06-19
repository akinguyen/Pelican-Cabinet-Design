"use client";

import { useMemo, useState } from "react";
import { ChevronDown, History, Redo2, Undo2 } from "lucide-react";
import { useDesignSceneStore } from "@/engine/scene/designSceneStore";
import { getVisibleSceneHistoryEntries } from "@/engine/scene/actions/sceneHistoryActions";

export function KitchenEditorHistoryControls() {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const pastEntries = useDesignSceneStore((state) => state.sceneHistory.past);
  const futureEntries = useDesignSceneStore((state) => state.sceneHistory.future);
  const visibleEntries = useMemo(() => getVisibleSceneHistoryEntries(pastEntries), [pastEntries]);
  const canUndo = pastEntries.length > 0;
  const canRedo = futureEntries.length > 0;

  return (
    <div className="relative flex items-center gap-1 pr-2">
      <button
        type="button"
        disabled={!canUndo}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => useDesignSceneStore.getState().undoDesignSceneChange()}
        title="Undo"
      >
        <Undo2 aria-hidden="true" size={16} strokeWidth={2} />
        <span>Undo</span>
      </button>
      <button
        type="button"
        disabled={!canRedo}
        className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        onClick={() => useDesignSceneStore.getState().redoDesignSceneChange()}
        title="Redo"
      >
        <Redo2 aria-hidden="true" size={16} strokeWidth={2} />
        <span>Redo</span>
      </button>
      <button
        type="button"
        className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        onClick={() => setIsHistoryOpen((current) => !current)}
        title="History"
      >
        <History aria-hidden="true" size={16} strokeWidth={2} />
        <span>History</span>
        <ChevronDown aria-hidden="true" size={14} strokeWidth={2} />
      </button>
      {isHistoryOpen ? (
        <div className="absolute left-0 top-10 z-50 w-72 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent scene changes
          </div>
          <div className="max-h-80 overflow-y-auto py-1">
            {visibleEntries.length === 0 ? (
              <div className="px-3 py-3 text-sm text-slate-500">No history yet.</div>
            ) : visibleEntries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-slate-50"
                onClick={() => {
                  useDesignSceneStore.getState().restoreDesignSceneHistoryEntry(entry.id);
                  setIsHistoryOpen(false);
                }}
              >
                <span className="font-medium text-slate-800">{entry.label}</span>
                <span className="text-xs text-slate-500">{new Date(entry.createdAtMs).toLocaleTimeString()}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
