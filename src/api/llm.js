import fs from "node:fs/promises";
import path from "node:path";

import { getTokenizer } from "@anthropic-ai/tokenizer";
import fetch from "node-fetch";

import { systemPrompt } from "../config/prompts.js";
import { WORKFLOW_PROMPTS } from "../workflows.js";

const API_BASE = "http://127.0.0.1:8080";
const MODEL = "qwen";
const AGENTS_MD_PATH = process.cwd();
const AGENTS_MD_FILENAME = "agents.md";
const AGENTS_MD_MAX_CHARS = 10000;
const CONTEXT_LIMIT = 64000;

/**
 * Reads agents.md from the project root and truncates to AGENTS_MD_MAX_CHARS.
 * Returns empty string if file doesn't exist.
 * @param {string} agentsPath - The directory where agents.md is located (defaults to process.cwd())
 * @param {number} maxChars - Maximum characters to read (defaults to AGENTS_MD_MAX_CHARS)
 */
export async function loadAgentsMd(agentsPath = AGENTS_MD_PATH, maxChars = AGENTS_MD_MAX_CHARS) {
  try {
    const fullPath = path.join(agentsPath, AGENTS_MD_FILENAME);
    const content = await fs.readFile(fullPath, "utf-8");
    return content.slice(0, maxChars);
  } catch {
    return "";
  }
}

/**
 * Estimates token count using Anthropic Tokenizer (with fallback to character / 4).
 * @param {Array} messages - Array of { role, text } message objects.
 * @returns {number} Estimated token count.
 */
export function estimateTokenCount(messages) {
  const combined = messages.map((m) => m.text || "").join("\n");
  try {
    const tokenizer = getTokenizer();
    return tokenizer.countTokens(combined);
  } catch {
    const totalChars = messages.reduce((sum, m) => sum + (m.text?.length || 0), 0);
    return Math.ceil(totalChars / 4);
  }
}

/**
 * Formats token usage for display.
 * @param {number} used - Number of tokens used.
 * @param {number} limit - Context window limit.
 * @returns {string} Formatted string like "32.0k/64.0k (50%)"
 */
export function formatTokenUsage(used, limit = CONTEXT_LIMIT) {
  const percentage = Math.round((used / limit) * 100);
  const usedDisplay = used >= 1000 ? `${(used / 1000).toFixed(1)}k` : used;
  const limitDisplay = `${(limit / 1000).toFixed(1)}k`;
  return `${usedDisplay}/${limitDisplay} (${percentage}%)`;
}

/**
 * Formats messages for the LLM API.
 * Detects role transitions, injects role labels where needed, and strips forgekeeper metadata.
 * @param {Array} messages - Array of { role, text, forgekeeper? } message objects.
 * @returns {Array} Formatted messages with role labels and forgekeeper metadata stripped.
 */
export function formatMessagesForLLM(messages) {
  const result = [];
  let prevRole = "system";
  let prevForgekeeperRole = null;

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    let processedMsg = { role: msg.role, content: msg.text };

    if (msg.role === "system") {
      prevRole = "system";
      prevForgekeeperRole = null;
      result.push(processedMsg);
      continue;
    }

    const currentForgekeeperRole = msg.forgekeeper?.role;

    if (currentForgekeeperRole) {
      const isFirstNonSystem = prevRole === "system" || prevForgekeeperRole === null;
      const isRoleTransition = prevForgekeeperRole !== null && currentForgekeeperRole !== prevForgekeeperRole;

      if (isFirstNonSystem || isRoleTransition) {
        if (isFirstNonSystem) {
          processedMsg.content = `[Role: ${currentForgekeeperRole}]\n${processedMsg.content}`;
        } else {
          processedMsg.content = `[Role Transition: ${prevForgekeeperRole} → ${currentForgekeeperRole}]\n${processedMsg.content}`;
        }
      }

      prevForgekeeperRole = currentForgekeeperRole;
    }

    prevRole = msg.role;
    delete processedMsg.forgekeeper;
    result.push(processedMsg);
  }

  return result;
}

/**
 * Sends messages to the LLM API and returns the assistant response.
 * Loads system prompt from config, attaches agents.md, and formats messages for the API.
 * @param {Array} messages - Array of { role, text, forgekeeper? } message objects.
 * @param {Object} settings - Settings object with optional `role` field.
 * @returns {Promise<string>} The assistant's response text.
 */
export async function chat(messages, settings, _agentsPath = AGENTS_MD_PATH) {
  const workflowMode = settings?.workflowMode;
  const workflowPrompt = WORKFLOW_PROMPTS[workflowMode] || "";

  let systemPromptContent = systemPrompt;
  if (workflowPrompt) {
    systemPromptContent = `${workflowPrompt}\n\n${systemPromptContent}`;
  }

  const agentsMd = await loadAgentsMd(_agentsPath);
  if (agentsMd) {
    systemPromptContent = `${systemPromptContent}\n\n--- agents.md ---\n${agentsMd}`;
  }

  const hasSystemPrompt = messages.some((m) => m.role === "system");
  const systemMsg = hasSystemPrompt
    ? messages.find((m) => m.role === "system")
    : { role: "system", text: systemPromptContent, forgekeeper: { role: null } };

  const mergedSystem = {
    role: "system",
    text: `${systemPromptContent}\n\n${systemMsg.text}`.trim(),
  };

  const nonSystemMessages = messages.filter((m) => m.role !== "system");
  const allMessages = [mergedSystem, ...nonSystemMessages];
  const formattedMessages = formatMessagesForLLM(allMessages);

  const response = await fetch(`${API_BASE}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: formattedMessages,
      max_tokens: 4096,
      top_p: 1,
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`API error: ${response.status} ${response.statusText} - ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "[No response]";
}

export { CONTEXT_LIMIT };
