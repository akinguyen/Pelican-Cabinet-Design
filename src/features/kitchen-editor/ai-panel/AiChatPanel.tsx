"use client";

import type { FormEvent } from "react";

export type AiChatMessage = Readonly<{
  id: string;
  role: "assistant" | "user";
  content: string;
}>;

type AiChatPanelProps = Readonly<{
  messages: readonly AiChatMessage[];
  inputValue: string;
  onInputChange: (value: string) => void;
  onSendMessage: () => void;
}>;

export function AiChatPanel({
  messages,
  inputValue,
  onInputChange,
  onSendMessage,
}: AiChatPanelProps) {
  const canSend = inputValue.trim().length > 0;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSend) {
      return;
    }

    onSendMessage();
  };

  return (
    <section className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="shrink-0 border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-950">AI Assistant Chat</h2>
        <p className="text-xs text-slate-500">
          UI shell only. Agent APIs and scene commands are not connected yet.
        </p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 text-sm">
        <section className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</p>
          <h3 className="mt-1 text-sm font-semibold text-slate-950">Ready for agent integration</h3>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            This panel keeps local chat messages only. It is preserved as the future left-side AI agent surface.
          </p>
        </section>
        <div className="space-y-2">
          {messages.map((message) => (
            <article
              key={message.id}
              className={message.role === "assistant"
                ? "rounded-xl bg-slate-50 px-3 py-2 text-slate-700"
                : "rounded-xl bg-blue-600 px-3 py-2 text-white"}
            >
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                {message.role === "assistant" ? "Assistant" : "You"}
              </p>
              <p className="mt-1 whitespace-pre-wrap leading-5">{message.content}</p>
            </article>
          ))}
        </div>
      </div>
      <form onSubmit={handleSubmit} className="shrink-0 border-t border-slate-200 bg-white p-3">
        <textarea
          className="h-20 w-full resize-none rounded-lg border border-slate-200 bg-white p-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          placeholder="Type a message for the future AI agent."
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (canSend) {
                onSendMessage();
              }
            }
          }}
        />
        <button
          type="submit"
          disabled={!canSend}
          className="mt-2 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"
        >
          Send
        </button>
      </form>
    </section>
  );
}
