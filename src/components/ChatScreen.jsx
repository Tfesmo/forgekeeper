import * as inquirer from "@inquirer/prompts";
import { Box, Text, useInput, useStdin, useStdout } from "ink";
import { ScrollView } from "ink-scroll-view";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";

import { formatTokenUsage } from "../api/llm.js";
import { COMMANDS } from "../commands/index.js";
import { loadSettings, saveSettings } from "../settings.js";

export default function ChatScreen({
  onCommand,
  onSubmit,
  isLoading,
  messages = [],
  tokenUsage = { used: 0, limit: 64000 },
  agentsWarning,
}) {
  const [input, setInput] = useState("");
  const [isInquirer, setIsInquirer] = useState(false);
  const scrollRef = useRef(null);
  const { stdin } = useStdin();
  const { stdout } = useStdout();

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

  /**
   * Processes a slash command and dispatches to the appropriate handler.
   * @param {string} trimmed - The input string starting with "/".
   */
  function processCommand(trimmed) {
    const cmd = trimmed.slice(1).trim();

    if (cmd.startsWith("settings")) {
      handleSettings();
    } else if (cmd.startsWith("help")) {
      onCommand("help", "");
    } else {
      const knownNames = Object.keys(COMMANDS).filter((n) => n !== "help" && n !== "settings");
      const matched = knownNames.find((name) => cmd.startsWith(name));

      if (matched) {
        onCommand(matched, cmd.slice(matched.length).trim());
      } else {
        onCommand("_unknown", cmd);
      }
    }
  }

  /**
   * Scrolls the chat view by a delta amount.
   * @param {number} delta - Positive to scroll down, negative to scroll up.
   */
  function handleScroll(delta) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy(delta);
  }

  /**
   * Scrolls to the bottom of the chat.
   */
  function scrollToBottom() {
    if (!scrollRef.current) return;
    scrollRef.current.scrollToBottom();
  }

  useInput((inputChar, key) => {
    if (isInquirer) return false;

    if (key.escape) {
      setInput("");
      return true;
    }

    if (key.tab) {
      setInput("/");
      return true;
    }

    if (key.return && input.trim()) {
      const trimmed = input.trim();

      if (trimmed.startsWith("/")) {
        processCommand(trimmed);
      } else {
        onSubmit(trimmed);
      }

      setInput("");
      return true;
    }

    if (key.backspace) {
      setInput((prev) => prev.slice(0, -1));
      return true;
    }

    // Scroll handling
    if (key.upArrow) {
      handleScroll(-1);
      return true;
    }

    if (key.downArrow) {
      handleScroll(1);
      return true;
    }

    if (key.pageUp) {
      handleScroll(-(stdout?.rows || 24));
      return true;
    }

    if (key.pageDown) {
      handleScroll(stdout?.rows || 24);
      return true;
    }

    if (key.home) {
      if (scrollRef.current) {
        scrollRef.current.scrollToTop();
      }
      return true;
    }

    if (key.end) {
      scrollToBottom();
      return true;
    }

    if (!key.ctrl && !key.meta && inputChar.length === 1) {
      setInput((prev) => prev + inputChar);
      return true;
    }

    return false;
  }, []);

  // Handle mouse wheel events (xterm mouse protocol) via stdin directly
  useEffect(() => {
    if (!stdin || !stdin.isTTY) return;

    // Enable xterm mouse mode (SGR mode) so wheel events come through stdin
    stdout?.write("\x1b[?1002h");

    const mouseBuffer = [];

    const onData = (chunk) => {
      if (isInquirer) return;

      for (let i = 0; i < chunk.length; i++) {
        mouseBuffer.push(chunk[i]);

        // Check for xterm mouse wheel: ESC [ < M
        // Wheel up: event 64, Wheel down: event 65
        if (
          mouseBuffer.length >= 9 &&
          mouseBuffer[0] === 0x1b &&
          mouseBuffer[1] === 0x5b &&
          mouseBuffer[2] === 0x3c
        ) {
          const eventType = mouseBuffer[5];
          if (eventType === 64) {
            handleScroll(-3);
          } else if (eventType === 65) {
            handleScroll(3);
          }
          mouseBuffer.length = 0;
          continue;
        }

        // Clear buffer on malformed sequences
        if (mouseBuffer.length > 20) {
          mouseBuffer.length = 0;
        }
      }
    };

    stdin.on("data", onData);

    return () => {
      stdin.off("data", onData);
      stdout?.write("\x1b[?1002l");
      mouseBuffer.length = 0;
    };
  }, [stdin, stdout, isInquirer]);

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
  const prevMsgCountRef = useRef(messages.length);

  useLayoutEffect(() => {
    if (messages.length > prevMsgCountRef.current) {
      prevMsgCountRef.current = messages.length;
      const timer =
        typeof requestAnimationFrame === "function"
          ? requestAnimationFrame(() => {
              scrollRef.current?.scrollToBottom();
            })
          : setTimeout(() => {
              scrollRef.current?.scrollToBottom();
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
          {messages.filter((msg) => msg.role !== "system").map((msg, i) => (
            <Box key={i} flexDirection="column">
              <Text bold color={msg.role === "user" ? "white" : "cyan"}>
                {msg.role === "user" ? "You" : "AI"}:
              </Text>
              <Text>{msg.text}</Text>
            </Box>
          ))}
          {isLoading && (
            <Box flexDirection="column">
              <Text bold color="cyan">
                AI:
              </Text>
              <Text>Thinking...</Text>
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
        <Box justifyContent="space-between">
          <Box>
            <Text color="green">{"$ "}</Text>
            <Text color={isSlash ? "yellow" : undefined}>{input}</Text>
            {!input && <Text dimColor>{"press Tab for commands"}</Text>}
          </Box>
          {messages.length > 0 && (
            <Text dimColor>{formatTokenUsage(tokenUsage.used, tokenUsage.limit)}</Text>
          )}
        </Box>
      </Box>
    </Box>
  );
}
