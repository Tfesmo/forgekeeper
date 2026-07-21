import * as inquirer from "@inquirer/prompts";
import { Box, Text, useInput, useStdin } from "ink";
import { ScrollView } from "ink-scroll-view";
import { useMouse } from "@ink-tools/ink-mouse";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

import { formatTokenUsage } from "../api/llm.js";
import { getRoleConfig } from "../config/ui.js";
import { loadSettings, saveSettings } from "../settings.js";
import { WORKFLOW_NAME } from "../workflows.js";

import { handleInput } from "./keyHandler.js";
import {
  buildInputRefs,
  getMessageLabel,
  handleScroll,
  INPUT_AREA_HEIGHT,
  INPUT_PADDING_COLUMNS,
  scrollToBottom,
} from "./chatHelpers.js";
import { handleSettings } from "./settingsHandlers.js";
import { EmptyState, LoadingIndicator, MessageList } from "./messageComponents.jsx";

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
  const [cursorVisible, setCursorVisible] = useState(true);

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

  // Blinking cursor effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 500);
    return () => clearInterval(timer);
  }, []);

  const history = messages
    .filter((msg) => msg.role === "user")
    .map((msg) => msg.text)
    .filter(Boolean);
  userMessagesHistoryRef.current = history;

  const { stdout } = useStdin();

  // Collect refs into a single object for the key handler
  const inputRefs = buildInputRefs(
    {
      isInquirerRef,
      scrollRef,
      shiftHeldRef,
      scrollTimerRef,
      scrollSpeedRef,
      inputRef,
      historyIndexRef,
      userMessagesHistoryRef,
      stdout,
      handleSettings: () =>
        handleSettings(setIsInquirer, setCurrentRole, onRoleToggle),
      currentRole,
      setCurrentRole,
    },
    {
      onCommand,
      onSubmit,
      onRoleToggle,
      setInput,
    },
  );

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
  const messageAreaHeight = (process.stdout.rows || 24) - INPUT_AREA_HEIGHT;

  // Input area role config
  const inputRoleConfig = getRoleConfig(currentRole);

  return (
    <Box flexDirection="column" height={process.stdout.rows || 24}>
      <Box
        flexGrow={1}
        flexDirection="column"
        overflow="hidden"
        minHeight={messageAreaHeight}
      >
        <ScrollView ref={scrollRef}>
          <MessageList messages={messages} currentRole={currentRole} />
          {isLoading && <LoadingIndicator currentRole={currentRole} />}
          {!messages.length && !isLoading && <EmptyState />}
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
            <Box maxWidth={process.stdout.columns - INPUT_PADDING_COLUMNS} flexWrap="wrap">
              <Text color={isSlash ? "yellow" : undefined}>{input}</Text>
              {!input && <Text dimColor>{"press Tab to switch role"}</Text>}
              <Text>{cursorVisible ? "█" : ""}</Text>
            </Box>
          </Box>
          {messages.length > 0 && (
            <Text dimColor>{formatTokenUsage(tokenUsage.used, tokenUsage.limit)}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
