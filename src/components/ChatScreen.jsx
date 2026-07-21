import * as inquirer from "@inquirer/prompts";
import { Box, Text, useInput, useStdin } from "ink";
import { ScrollView } from "ink-scroll-view";
import { useMouse } from "@ink-tools/ink-mouse";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

import { formatTokenUsage } from "../api/llm.js";
import { COMMANDS } from "../commands/index.js";
import { getRoleConfig } from "../config/ui.js";
import { loadSettings, saveSettings } from "../settings.js";
import { WORKFLOW_NAME } from "../workflows.js";

import { handleInput } from "./keyHandler.js";
import {
  getMessageLabel,
  handleScroll,
  scrollToBottom,
} from "./chatHelpers.js";

export default function ChatScreen({
  onCommand,
  onSubmit,
  isLoading,
  messages = [],
  tokenUsage = { used: 0, limit: 64000 },
  agentsWarning,
  agentRole = "analyst",
  onRoleToggle,
}) {
  // Local state
  const [input, setInput] = useState("");
  const [isInquirer, setIsInquirer] = useState(false);
  const [currentRole, setCurrentRole] = useState(agentRole);

  // ScrollView reference for scroll operations
  const scrollRef = useRef(null);

  // Tracks Shift key state for text selection mode (disables mouse/scroll)
  const shiftHeldRef = useRef(false);

  // Synced copy of isInquirer state for useInput (avoids stale closure)
  const isInquirerRef = useRef(false);

  // Index into user message history for Up/Down arrow navigation
  const historyIndexRef = useRef(-1);

  // Timer for accelerating scroll speed during held keys
  const scrollTimerRef = useRef(null);

  // Current scroll speed multiplier (accelerates when holding Ctrl+arrows)
  const scrollSpeedRef = useRef(1);

  // Mutable copy of input state for useInput closure
  const inputRef = useRef("");

  // User messages only, for Up/Down history navigation
  const userMessagesHistoryRef = useRef([]);

  // Previous message count to detect new messages for auto-scroll
  const prevMsgCountRef = useRef(messages.length);

  inputRef.current = input;
  isInquirerRef.current = isInquirer;

  const history = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.text)
    .filter(Boolean);
  userMessagesHistoryRef.current = history;

  const { stdout } = useStdin();

  // Collect refs into a single object for the key handler
  const inputRefs = {
    isInquirer: isInquirerRef.current,
    scrollRef,
    shiftHeldRef,
    scrollTimerRef,
    scrollSpeedRef,
    inputRef,
    historyIndexRef,
    userMessagesHistoryRef,
    stdout,
    onCommand,
    onSubmit,
    handleSettings,
    currentRole,
    setCurrentRole,
    onRoleToggle,
    setInput,
    getCommandNames: () =>
      Object.keys(COMMANDS).filter((n) => n !== "help" && n !== "settings"),
  };

  /**
   * Opens an inquirer prompt to edit system prompt role.
   * Loads existing settings, prompts for new role, and saves.
   */
  async function handleSettings() {
    setIsInquirer(true);
    const settings = await loadSettings();

    const role = await inquirer.input({
      message: "System prompt role",
      default: settings.role,
    });

    await saveSettings({ ...settings, role });
    setIsInquirer(false);
  }

  useInput((inputChar, key) => {
    return handleInput(inputChar, key, inputRefs);
  }, []);

  // Handle mouse wheel events via @ink-tools/ink-mouse
  useMouse({
    onMouseWheel: (wheel) => {
      if (isInquirerRef.current) return;
      if (shiftHeldRef.current) return;
      const delta = wheel === "UP" ? -3 : 3;
      handleScroll(delta, scrollRef, shiftHeldRef);
    },
  });

  // Listen for terminal resize and scroll to bottom on new messages
  useEffect(() => {
    const handleResize = () => {
      scrollRef.current?.remeasure();
    };

    if (typeof stdout?.on === "function") {
      stdout.on("resize", handleResize);
      return () => {
        stdout.off("resize", handleResize);
      };
    }
  }, [stdout]);

  // Scroll to bottom when new messages arrive
  useLayoutEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = messages.length;
      historyIndexRef.current = -1;
      const timer =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(() => {
              scrollToBottom(scrollRef);
            })
          : setTimeout(() => {
              scrollToBottom(scrollRef);
            }, 50);
      return () => {
        if (typeof requestAnimationFrame === "function") {
          cancelAnimationFrame(timer);
        } else {
          clearTimeout(timer);
        }
      };
    } else {
      prevMsgCountRef.current = messages.length;
    }
  }, [messages]);

  const isSlash = input.startsWith("/");

  // Calculate visible height for the message area
  const inputAreaHeight = 4; // input box + token usage line
  const messageAreaHeight = (process.stdout.rows || 24) - inputAreaHeight;

  // Input area role config
  const inputRoleConfig = getRoleConfig(currentRole);

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      <Box
        flexGrow={1}
        flexDirection="column"
        overflow="hidden"
        minHeight={messageAreaHeight}
        maxHeight={messageAreaHeight}
      >
        <ScrollView ref={scrollRef}>
          {messages
            .filter((msg) => msg.role !== "system")
            .map((msg, i) => {
              const roleConfig = getMessageLabel(msg.role, currentRole);
              return (
                <Box key={i} flexDirection="column">
                  <Text bold color={roleConfig.color}>
                    {roleConfig.symbol} {roleConfig.label}:
                  </Text>
                  <Text>{msg.text}</Text>
                </Box>
              );
            })}
          {isLoading && (
            <Box flexDirection="column">
              {(() => {
                const aiConfig = getRoleConfig(currentRole);
                return (
                  <>
                    <Text bold color={aiConfig.color}>
                      {aiConfig.symbol} {aiConfig.label}:
                    </Text>
                    <Text>Thinking...</Text>
                  </>
                );
              })()}
            </Box>
          )}
          {!messages.length && !isLoading && (
            <Box flexDirection="column" marginTop={1}>
              <Text>Forgekeeper ready.</Text>
              <Text dimColor> Type a message or press Tab for commands. Escape clears input.</Text>
            </Box>
          )}
          {agentsWarning && (
            <Box flexDirection="column">
              <Text color="yellow">{agentsWarning}</Text>
            </Box>
          )}
        </ScrollView>
      </Box>
      <Box flexDirection="column">
        <Text>{WORKFLOW_NAME}</Text>
        <Box justifyContent="space-between">
          <Box>
            <Text color="green">{"$ "}</Text>
            <Text bold color={inputRoleConfig.color}>
              {inputRoleConfig.symbol} [{inputRoleConfig.label}]{" "}
            </Text>
            <Text color={isSlash ? "yellow" : undefined}>{input}</Text>
            {!input && <Text dimColor>{"press Tab to switch role"}</Text>}
          </Box>
          {messages.length > 0 && (
            <Text dimColor>{formatTokenUsage(tokenUsage.used, tokenUsage.limit)}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
