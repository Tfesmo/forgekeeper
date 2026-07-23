import { readFileSync, existsSync, mkdirSync, appendFileSync, closeSync, openSync } from "fs";
import { constants } from "fs";
const { O_WRONLY, O_CREAT, O_APPEND } = constants;

import { finalizeSessionOnSuccess, finalizeSessionOnError } from "../stores/sessionStore.js";

const AGENTS_CONTENT = readFileSync("agents.md", "utf-8");

const API_URL = "http://127.0.0.1:8080/v1/chat/completions";
const SESSION_DIR = process.env.SESSION_DIR || ".forgekeeper/sessions";
const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS, 10) || 60_000;

/**
 * Strips forgekeeper metadata from messages before sending to the LLM API.
 * The llama.cpp API only accepts { role, content } — extra properties cause rejection.
 */
export function prepareMessagesForAPI(messages) {
  return messages.map((msg) => {
    const { forgekeeper: _, ...rest } = msg;
    return rest;
  });
}

export function buildSystemMessage(_mode) {
  const content =
    `
    You are an expert software engineer and technical writer.
    Your available modes are:
    [[ analyst ]]: As an analyst you never make changes but help the user analyze issues and plan future code.
    [[ implementor ]]: As an implementor you write new code while carefully following your guidelines.` +
    AGENTS_CONTENT;

  return content;
}

/**
 * Streams LLM response chunks via a callback.
 * Returns a Promise that resolves when streaming completes or rejects on error.
 *
 * @param {object} session - The session object to update
 * @param {AbortSignal} signal - Abort signal for cancellation
 * @param {function} onChunk - Callback for each chunk: onChunk(content, type)
 *   where type is "content" or "reasoning"
 * @returns {Promise<void>}
 */
export async function callLLMStreaming(session, signal, onChunk) {
  // Open log file if stream logging is enabled
  let logFd = null;
  const logStream = process.env.LOG_STREAM === "true";
  if (logStream) {
    const logFile = `${SESSION_DIR}/${session.id}.log`;
    try {
      if (!existsSync(SESSION_DIR)) {
        mkdirSync(SESSION_DIR, { recursive: true });
      }
      logFd = openSync(logFile, O_WRONLY | O_CREAT | O_APPEND, 0o644);
      appendFileSync(logFd, `\n--- ${new Date().toISOString()} ---\n`);
    } catch {
      logFd = null;
    }
  }

  const combinedSignal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(LLM_TIMEOUT_MS)])
    : AbortSignal.timeout(LLM_TIMEOUT_MS);
  try {
    const messagesForAPI = prepareMessagesForAPI(session.messages);

    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: combinedSignal,
      body: JSON.stringify({
        model: "qwen",
        max_tokens: 4096,
        top_p: 1,
        stream: true,
        messages: messagesForAPI,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const errorMessage = `API error: ${res.status} - ${text}`;
      await finalizeSessionOnError(session.id, errorMessage);
      throw new Error(errorMessage);
    }

    // Parse SSE chunks from llama.cpp response
    const reader = res.body.getReader();
    let decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let reasoningContent = "";
    let usage = null;
    let timings = null;

    while (true) {
      const { done: streamDone, value } = await reader.read();
      if (streamDone) break;
      if (combinedSignal.aborted) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.startsWith("data:") || line.length <= 5) {
          continue;
        }
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];

          // Stream content chunk
          if (choice?.delta?.content) {
            content += choice.delta.content;
            onChunk(choice.delta.content, "content");
            if (logFd !== null) {
              appendFileSync(logFd, `[content] ${choice.delta.content}`);
            }
          }

          // Stream reasoning chunk
          if (choice?.delta?.reasoning_content) {
            reasoningContent += choice.delta.reasoning_content;
            onChunk(choice.delta.reasoning_content, "reasoning");
            if (logFd !== null) {
              appendFileSync(logFd, `[reasoning] ${choice.delta.reasoning_content}`);
            }
          }

          // Capture usage/timings from SSE chunks
          if (parsed.usage) {
            usage = parsed.usage;
          }
          if (parsed.timings) {
            timings = parsed.timings;
          }
        } catch (parseErr) {
          console.error("[llm] parse error:", parseErr.message);
        }
      }
    }

    // Finalize session
    const assistantMessage = {
      role: "assistant",
      content,
      reasoning_content: reasoningContent || null,
      forgekeeper: {
        mode: session.mode,
        metrics: {
          usage: usage || null,
          timings: timings || null,
        },
      },
    };
    await finalizeSessionOnSuccess(session.id, assistantMessage);
  } catch (err) {
    if (!combinedSignal.aborted) {
      await finalizeSessionOnError(session.id, err.message);
    } else if (!signal.aborted) {
      await finalizeSessionOnError(
        session.id,
        `LLM request timed out after ${LLM_TIMEOUT_MS / 1000}s`,
      );
    }
    throw err;
  } finally {
    if (logFd !== null) {
      try {
        closeSync(logFd);
      } catch {
        // ignore close errors
      }
    }
  }
}
