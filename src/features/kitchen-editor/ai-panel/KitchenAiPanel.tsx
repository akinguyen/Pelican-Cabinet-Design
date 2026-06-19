"use client";

import { useState } from "react";
import { AiChatPanel, type AiChatMessage } from "./AiChatPanel";

const initialAiMessages: readonly AiChatMessage[] = [
  {
    id: "assistant-welcome",
    role: "assistant",
    content:
      "AI chat is currently a UI shell only. Messages stay in this panel and do not run scene commands, call an AI service, or change the design.",
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
          "This chat shell is not connected to scene editing yet. We can attach a command layer or AI service here later.",
      },
    ]);
    setInputValue("");
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-50 p-3">
      <AiChatPanel
        messages={messages}
        inputValue={inputValue}
        onInputChange={setInputValue}
        onSendMessage={handleSendMessage}
      />
    </div>
  );
}
