"use client";

import type { ReactNode } from "react";

type AiChatPanelProps = Readonly<{
  contextSummary: ReactNode;
}>;

export function AiChatPanel({ contextSummary }: AiChatPanelProps) {
  return (
    <section className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-950">AI Assistant Chat</h2>
        <p className="text-xs text-slate-500">
          Ask the AI to review the scene or help generate a design while you keep editing.
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        {contextSummary}
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-800">
          AI proposal generation will connect here next. The editor stays active while this panel is open.
        </div>
      </div>
      <div className="shrink-0 border-t border-slate-200 bg-white p-3">
        <textarea
          className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 p-2 text-sm text-slate-500 outline-none"
          disabled
          placeholder="AI chat connection coming next"
        />
        <button
          type="button"
          disabled
          className="mt-2 w-full rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-500"
        >
          Send
        </button>
      </div>
    </section>
  );
}
