import fs from "node:fs/promises";
import path from "node:path";

import fetch from "node-fetch";

import { getTokenizer } from "@anthropic-ai/tokenizer";

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
 * Sends messages to the LLM API and returns the assistant response.
 * Prepends a system prompt with agents.md content and maps user message objects before sending.
 * @param {Array} messages - Array of { role, text } message objects.
 * @param {Object} settings - Settings object with optional `role` field.
 * @returns {Promise<string>} The assistant's response text.
 */
export async function chat(messages, settings, agentsPath = AGENTS_MD_PATH) {
  const basePrompt = settings?.role || "You are a software engineer and competent technical document writer.";
  const agentsMd = await loadAgentsMd(agentsPath);

  let systemPrompt = basePrompt;
  if (agentsMd) {
    systemPrompt = `${basePrompt}\n\n--- agents.md ---\n${agentsMd}`;
  }

  const hasSystemPrompt = messages.some((m) => m.role === "system");
  const formattedMessages = hasSystemPrompt
    ? messages.map((m) => ({ role: m.role, content: m.text }))
    : [
        { role: "system", content: systemPrompt },
        ...messages.map((m) => ({
          role: m.role,
          content: m.text,
        })),
      ];

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
