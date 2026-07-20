import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import * as inquirer from "@inquirer/prompts";
import { Box, Text, useInput, useStdin, useStdout } from "ink";
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import { ScrollView } from "ink-scroll-view";

import { formatTokenUsage } from "../api/llm.js";

/**
 * Returns the settings directory path, creating it if it doesn't exist.
 * @returns {Promise<string>} The absolute path to the settings directory.
 */
async function getSettingsDir() {
  const home = os.homedir();
  const dir = path.join(home, ".forgekeeper");
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
  return dir;
}

/**
 * Loads settings from the user's home directory.
 * Returns default settings if the file doesn't exist.
 * @returns {Promise<Object>} The settings object with a `role` field.
 */
async function loadSettings() {
  const dir = await getSettingsDir();
  const filePath = path.join(dir, "settings.json");
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch {
    return { role: "You are a software engineer and competent technical document writer." };
  }
}

/**
 * Saves settings to the user's home directory.
 * @param {Object} settings - The settings object to save.
 * @returns {Promise<void>}
 */
async function saveSettings(settings) {
  const dir = await getSettingsDir();
  const filePath = path.join(dir, "settings.json");
  await fs.writeFile(filePath, JSON.stringify(settings, null, 2));
}

export default function ChatScreen({ onCommand, onSubmit, isLoading, messages = [], tokenUsage = { used: 0, limit: 64000 }, agentsWarning }) {
  const [input, setInput] = useState("");
  const [isInquirer, setIsInquirer] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
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
      default:
        settings.role || "You are a software engineer and competent technical document writer.",
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
    } else if (cmd.startsWith("echoi")) {
      onCommand("echoi", cmd.slice("echoi".length).trim());
    } else if (cmd.startsWith("passthrough")) {
      onCommand("passthrough", cmd.slice("passthrough".length).trim());
    } else {
      onCommand("_unknown", trimmed.slice(1));
    }
  }

  /**
   * Scrolls the chat view by a delta amount.
   * @param {number} delta - Positive to scroll down, negative to scroll up.
   */
  function handleScroll(delta) {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy(delta);
    setIsAtBottom(false);
  }

  /**
   * Scrolls to the bottom of the chat.
   */
  function scrollToBottom() {
    if (!scrollRef.current) return;
    scrollRef.current.scrollToBottom();
    setIsAtBottom(true);
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
      setIsAtBottom(false);
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
        if (mouseBuffer.length >= 9 && 
            mouseBuffer[0] === 0x1b && 
            mouseBuffer[1] === 0x5b && 
            mouseBuffer[2] === 0x3c) {
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
      const timer = typeof requestAnimationFrame === "function"
        ? requestAnimationFrame(() => {
          scrollRef.current?.scrollToBottom();
          setIsAtBottom(true);
        })
        : setTimeout(() => {
          scrollRef.current?.scrollToBottom();
          setIsAtBottom(true);
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
          {messages.map((msg, i) => (
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

export { loadSettings };
