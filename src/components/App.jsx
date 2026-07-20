import React, { useState, useCallback, useEffect, useRef } from "react";

import { chat, loadAgentsMd, estimateTokenCount, CONTEXT_LIMIT } from "../api/llm.js";
import ChatScreen from "./ChatScreen.jsx";
import { loadSettings } from "./ChatScreen.jsx";

export default function App() {
  const [messages, setMessages] = useState(() => []);
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState(null);
  const [agentsWarningShown, setAgentsWarningShown] = useState(false);
  const [agentsWarning, setAgentsWarning] = useState(null);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: CONTEXT_LIMIT });

  const settingsRef = useRef(null);
  const agentsWarningShownRef = useRef(false);
  const messagesRef = useRef([]);

  useEffect(() => {
    loadSettings().then((s) => {
      setSettings(s);
      settingsRef.current = s;
      loadAgentsMd(process.cwd()).then((agentsMd) => {
        const basePrompt = s?.role || "You are a software engineer and competent technical document writer.";
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
      setAgentsWarningShown(true);
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

  const handleCommand = useCallback((cmd, args) => {
    let response;

    switch (cmd) {
      case "help":
        response =
          `Available commands:\n` +
          `  /help          - Show this help message\n` +
          `  /settings      - Open settings editor\n` +
          `  /echoi <text>  - Echo test message\n` +
          `  /passthrough <text> - Passthrough test message`;
        break;
      case "echoi":
        response = `[echoi] ${args || "(no args)"}`;
        break;
      case "passthrough":
        response = `[passthrough] ${args || "(no args)"}`;
        break;
      case "_unknown":
        response = `Unknown command: /${args}`;
        break;
      default:
        response = `Unknown command: /${cmd}`;
    }

    setMessages((prev) => [...prev, { role: "assistant", text: response }]);
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
