"use client";

import { useState } from "react";
import { AiChatPanel, type AiChatMessage } from "./AiChatPanel";

const initialAiMessages: readonly AiChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "AI chat is preserved as a clean UI shell for the new kitchen design agent. The old export/import AI workflow has been removed, so this panel is ready for the future OpenAI API + engine tools integration.",
  },
];

export function KitchenAiPanel() {
  const [messages, setMessages] = useState<readonly AiChatMessage[]>(initialAiMessages);
  const [inputValue, setInputValue] = useState("");

  const handleSendMessage = () => {
    const trimmedMessage = inputValue.trim();

    if (trimmedMessage.length === 0) {
      return;
    }

    const timestamp = Date.now();

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `user-${timestamp}`,
        role: "user",
        content: trimmedMessage,
      },
      {
        id: `assistant-shell-${timestamp}`,
        role: "assistant",
        content:
          "This chat shell is not connected to the new AI agent backend yet. Next we can add agent APIs, scene tools, and OpenAI API calls behind this panel.",
      },
    ]);
    setInputValue("");
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 bg-slate-50 p-3">
      <section className="shrink-0 rounded-xl border border-blue-100 bg-blue-50 p-3 shadow-sm">
        <h2 className="text-sm font-semibold text-slate-950">Kitchen AI Agent</h2>
        <p className="mt-1 text-xs leading-5 text-slate-600">
          Clean chat shell only. Old AI package/export/import code is removed; this panel is kept for the new tool-driven agent.
        </p>
      </section>
      <AiChatPanel
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
