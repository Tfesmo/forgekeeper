import React, { useState, useCallback, useEffect, useRef } from "react";

import { chat, loadAgentsMd, estimateTokenCount, CONTEXT_LIMIT } from "../api/llm.js";
import { dispatchCommand } from "../commands/index.js";
import { loadSettings } from "../settings.js";
import ChatScreen from "./ChatScreen.jsx";

export default function App() {
  const [messages, setMessages] = useState(() => []);
  const [isLoading, setIsLoading] = useState(false);
  const [agentsWarning, setAgentsWarning] = useState(null);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: CONTEXT_LIMIT });

  const settingsRef = useRef(null);
  const agentsWarningShownRef = useRef(false);
  const messagesRef = useRef([]);

  useEffect(() => {
    loadSettings().then((s) => {
      settingsRef.current = s;
      loadAgentsMd(process.cwd()).then((agentsMd) => {
        const basePrompt =
          s?.role || "You are a software engineer and competent technical document writer.";
        let systemPrompt = basePrompt;
        if (agentsMd) {
          systemPrompt = `${basePrompt}\n\n--- agents.md ---\n${agentsMd}`;
        }
        messagesRef.current = [{ role: "system", text: systemPrompt }];
        setMessages(messagesRef.current);
        const used = estimateTokenCount([{ role: "system", text: systemPrompt }]);
        setTokenUsage({ used, limit: CONTEXT_LIMIT });
      });
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const handleSubmit = useCallback(async (text) => {
    const isFirstMessage = messagesRef.current.length <= 1;
    const newMessages = [...messagesRef.current, { role: "user", text }];
    setMessages(newMessages);
    setIsLoading(true);

    if (isFirstMessage && !agentsWarningShownRef.current) {
      const agentsMd = await loadAgentsMd(process.cwd());
      if (agentsMd.length > 10000) {
        const warning = `[Warning: agents.md exceeds 10,000 characters (${agentsMd.length} chars). Content has been truncated to 10,000 characters. Consider splitting into smaller files for better context management.]`;
        setAgentsWarning(warning);
      }
      agentsWarningShownRef.current = true;
    }

    try {
      const response = await chat(newMessages, settingsRef.current);
      const used = estimateTokenCount([...newMessages, { role: "assistant", text: response }]);
      setTokenUsage({ used, limit: CONTEXT_LIMIT });
      setMessages((prev) => [...prev, { role: "assistant", text: response }]);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "assistant", text: `[Error: ${err.message}]` }]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCommand = useCallback((name, args) => {
    setMessages((prev) => [...prev, { role: "assistant", text: dispatchCommand(name, args) }]);
  }, []);

  return (
    <ChatScreen
      messages={messages}
      onSubmit={handleSubmit}
      onCommand={handleCommand}
      isLoading={isLoading}
      tokenUsage={tokenUsage}
      agentsWarning={agentsWarning}
    />
  );
}
