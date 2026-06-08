"use client";

export function DesignerChatPanel() {
  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-950">AI Designer Chat</h2>
        <p className="text-xs text-slate-500">Ask the AI to review or redesign the current scene.</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        <div className="rounded-xl bg-slate-100 px-3 py-2 text-slate-700">
          Select an assembly or wall to include it as read-only context for the designer.
        </div>
        <div className="rounded-xl bg-blue-50 px-3 py-2 text-blue-800">
          AI proposal generation will connect here next. Manual scene editing is disabled in Designer mode.
        </div>
      </div>
      <div className="border-t border-slate-200 p-3">
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
