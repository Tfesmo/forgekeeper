import { readFileSync, existsSync, mkdirSync, appendFileSync, closeSync, openSync } from "fs";
import { constants } from "fs";
import { fileURLToPath } from "node:url";
import { join } from "path";
const { O_WRONLY, O_CREAT, O_APPEND } = constants;

import { LLM_TIMEOUT_MS, LLM_MODEL, LLM_MAX_TOKENS } from "../config/llm.js";
import { finalizeSessionOnSuccess, finalizeSessionOnError } from "../stores/sessionLifecycle.js";
import { getToolsSchema } from "../tools/index.js";
import { executeToolCalls } from "./toolExecutor.js";

function loadSystemFile() {
  const base = fileURLToPath(new URL("../..", import.meta.url)).replace(/\/$/, "");
  const candidates = ["AGENTS.md", "agents.md"];
  for (const candidate of candidates) {
    const fullPath = join(base, candidate);
    if (existsSync(fullPath)) {
      return readFileSync(fullPath, "utf-8");
    }
  }
  console.warn(
    "[forgekeeper] No agents.md/AGENTS.md found in project root. System prompt will be empty.",
  );
  return "";
}

const AGENTS_CONTENT = loadSystemFile();

const API_URL = process.env.LLM_API_URL || "http://127.0.0.1:8080/v1/chat/completions";
const SESSION_DIR = process.env.SESSION_DIR || ".forgekeeper/sessions";

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
    `You are an expert software engineer and technical writer.
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
        model: LLM_MODEL,
        max_tokens: LLM_MAX_TOKENS,
        top_p: 1,
        stream: true,
        messages: messagesForAPI,
        tools: getToolsSchema(),
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
    let toolCalls = [];
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
        if (!line.startsWith("data:")) {
          continue;
        }
        const data = line.slice(5).trim();
        if (data === "") continue;
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data);
          const choice = parsed.choices?.[0];

          // Stream content chunk
          if (choice?.delta?.content) {
            content += choice.delta.content;
            await onChunk(choice.delta.content, "content");
            if (logFd !== null) {
              appendFileSync(logFd, `[content] ${choice.delta.content}`);
            }
          }

          // Stream reasoning chunk
          if (choice?.delta?.reasoning_content) {
            reasoningContent += choice.delta.reasoning_content;
            await onChunk(choice.delta.reasoning_content, "reasoning");
            if (logFd !== null) {
              appendFileSync(logFd, `[reasoning] ${choice.delta.reasoning_content}`);
            }
          }

          // Stream tool call chunks
          if (choice?.delta?.tool_calls) {
            for (const tc of choice.delta.tool_calls) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = {
                  id: tc.id || null,
                  type: "function",
                  function: { name: "", arguments: "" },
                };
              }
              if (tc.function?.name) {
                toolCalls[tc.index].function.name += tc.function.name;
              }
              if (tc.function?.arguments) {
                toolCalls[tc.index].function.arguments += tc.function.arguments;
              }
              if (logFd !== null) {
                appendFileSync(logFd, `[tool_call] ${JSON.stringify(tc)}`);
              }
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

    // Log final accumulated tool calls once
    if (Object.keys(toolCalls).length > 0) {
      const toolCallsArray = Object.values(toolCalls);
      console.log("[llm] final tool_calls after streaming:", JSON.stringify(toolCallsArray));

      const incomplete = toolCallsArray
        .filter((tc) => {
          try {
            JSON.parse(tc.function?.arguments || "{}");
            return false;
          } catch {
            return true;
          }
        })
        .map((tc) => tc.function?.name);
      if (incomplete.length > 0) {
        console.warn("[llm] truncated tool calls detected on initial stream:", incomplete);
      }
    }

    // ---------------------------------------------------------------------------
    // Tool execution loop
    // ---------------------------------------------------------------------------
    let finalContent = content;
    let finalReasoningContent = reasoningContent;
    let finalToolCalls = toolCalls;

    let toolCallRound = 0;
    const MAX_TOOL_ROUNDS = 3;

    while (finalToolCalls?.length > 0 && toolCallRound < MAX_TOOL_ROUNDS) {
      toolCallRound++;
      console.log(
        `[llm] tool round ${toolCallRound}: executing ${finalToolCalls.length} tool call(s)`,
      );

      const toolResults = await executeToolCalls(finalToolCalls);

      // Build messages with tool results for the LLM
      const messagesWithTools = [
        ...messagesForAPI,
        { role: "assistant", content: finalContent, tool_calls: finalToolCalls },
        ...toolResults,
      ];

      console.log("[llm] sending tool results back to LLM, round", toolCallRound);

      const toolCallRes = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: combinedSignal,
        body: JSON.stringify({
          model: LLM_MODEL,
          max_tokens: LLM_MAX_TOKENS,
          top_p: 1,
          stream: true,
          messages: messagesWithTools,
        }),
      });

      if (!toolCallRes.ok) {
        const text = await toolCallRes.text();
        console.error(
          `[llm] tool round ${toolCallRound} API error: ${toolCallRes.status} - ${text.slice(0, 200)}`,
        );
        break;
      }

      let toolContent = "";
      let toolReasoning = "";
      let toolCallsResult = [];

      const toolReader = toolCallRes.body.getReader();
      let toolDecoder = new TextDecoder();
      let toolBuffer = "";

      while (true) {
        const { done: toolStreamDone, value } = await toolReader.read();
        if (toolStreamDone) break;
        if (combinedSignal.aborted) break;

        toolBuffer += toolDecoder.decode(value, { stream: true });
        const toolLines = toolBuffer.split("\n");
        toolBuffer = toolLines.pop();

        for (const line of toolLines) {
          if (!line.startsWith("data:")) continue;
          const data = line.slice(5).trim();
          if (!data || data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const choice = parsed.choices?.[0];
            if (choice?.delta?.content) {
              toolContent += choice.delta.content;
            }
            if (choice?.delta?.reasoning_content) {
              toolReasoning += choice.delta.reasoning_content;
            }
            if (choice?.delta?.tool_calls) {
              for (const tc of choice.delta.tool_calls) {
                if (!toolCallsResult[tc.index]) {
                  toolCallsResult[tc.index] = {
                    id: tc.id || null,
                    type: "function",
                    function: { name: "", arguments: "" },
                  };
                }
                if (tc.function?.name) {
                  toolCallsResult[tc.index].function.name += tc.function.name;
                }
                if (tc.function?.arguments) {
                  toolCallsResult[tc.index].function.arguments += tc.function.arguments;
                }
              }
            }
          } catch {}
        }
      }

      // Detect truncated tool calls (incomplete JSON in arguments)
      if (toolCallsResult.length > 0) {
        const incomplete = toolCallsResult
          .filter((tc) => {
            try {
              JSON.parse(tc.function?.arguments || "{}");
              return false;
            } catch {
              return true;
            }
          })
          .map((tc) => tc.function?.name);
        if (incomplete.length > 0) {
          console.warn("[llm] truncated tool calls detected:", incomplete);
        }
      }

      if (toolCallRound === 1) {
        finalContent = toolContent;
        finalReasoningContent = toolReasoning;
        finalToolCalls = toolCallsResult.length > 0 ? toolCallsResult : null;
      } else {
        // Append subsequent rounds
        finalContent += toolContent;
        if (toolReasoningContent && toolReasoning) {
          finalReasoningContent += toolReasoning;
        }
        if (toolCallsResult.length > 0) {
          finalToolCalls = toolCallsResult;
        }
      }

      console.log("[llm] tool round", toolCallRound, "complete:", toolContent.slice(0, 100));
    }

    // Finalize session
    const assistantMessage = {
      role: "assistant",
      content: finalContent || content,
      reasoning_content: finalReasoningContent || reasoningContent || null,
      tool_calls: finalToolCalls || (toolCalls.length > 0 ? toolCalls : null),
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
