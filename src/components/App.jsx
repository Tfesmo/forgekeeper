import React, { useState, useCallback, useEffect, useRef } from "react";

import { MouseProvider } from "@ink-tools/ink-mouse";
import { chat, loadAgentsMd, estimateTokenCount, CONTEXT_LIMIT } from "../api/llm.js";
import { dispatchCommand } from "../commands/index.js";
import { loadSettings } from "../settings.js";
import { WORKFLOW_DEFAULT, WORKFLOW_PROMPTS, cycleWorkflow } from "../workflows.js";
import ChatScreen from "./ChatScreen.jsx";

export default function App() {
  const [messages, setMessages] = useState(() => []);
  const [isLoading, setIsLoading] = useState(false);
  const [agentsWarning, setAgentsWarning] = useState(null);
  const [tokenUsage, setTokenUsage] = useState({ used: 0, limit: CONTEXT_LIMIT });
  const [currentRole, setCurrentRole] = useState(WORKFLOW_DEFAULT);

  const settingsRef = useRef(null);
  const agentsWarningShownRef = useRef(false);
  const messagesRef = useRef([]);
  const baseWorkflowRef = useRef(WORKFLOW_DEFAULT);
  const isLoadingRef = useRef(false);

  useEffect(() => {
    loadSettings().then((s) => {
      settingsRef.current = s;
      const workflowMode = s?.workflowMode || WORKFLOW_DEFAULT;
      loadAgentsMd(process.cwd()).then((agentsMd) => {
        const basePrompt =
          s?.role || "You are a software engineer and competent technical document writer.";
        const workflowPrompt = WORKFLOW_PROMPTS?.[workflowMode] || "";
        let systemPrompt = basePrompt;
        if (workflowPrompt) {
          systemPrompt = `${workflowPrompt}\n\n${basePrompt}`;
        }
        if (agentsMd) {
          systemPrompt = `${systemPrompt}\n\n--- agents.md ---\n${agentsMd}`;
        }
        messagesRef.current = [{ role: "system", text: systemPrompt, agentsMdContent: agentsMd }];
        setMessages(messagesRef.current);
        const used = estimateTokenCount([{ role: "system", text: systemPrompt }]);
        setTokenUsage({ used, limit: CONTEXT_LIMIT });
      });
    });
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (isLoadingRef.current === true && isLoading === false) {
      setCurrentRole((prev) => {
        if (prev === baseWorkflowRef.current) {
          return prev;
        }
        const reverted = cycleWorkflow(prev);
        baseWorkflowRef.current = reverted;
        return reverted;
      });
    }
  }, [isLoading]);

  const handleSubmit = useCallback(async (text) => {
    const isFirstMessage = messagesRef.current.length <= 1;
    const newMessages = [...messagesRef.current, { role: "user", text, forgekeeper: { role: currentRole } }];
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

  const handleRoleToggle = useCallback((nextRole) => {
    setCurrentRole(nextRole);
    const settings = settingsRef.current;
    if (settings) {
      settingsRef.current = { ...settings, workflowMode: nextRole };
    }
    const baseWorkflow = baseWorkflowRef.current;
    if (nextRole !== baseWorkflow) {
      const reverted = cycleWorkflow(nextRole);
      baseWorkflowRef.current = reverted;
    }
  }, []);

  return (
    <MouseProvider>
      <ChatScreen
        messages={messages}
        onSubmit={handleSubmit}
        onCommand={handleCommand}
        isLoading={isLoading}
        tokenUsage={tokenUsage}
        agentsWarning={agentsWarning}
        agentRole={currentRole}
        onRoleToggle={handleRoleToggle}
      />
    </MouseProvider>
  );
}
