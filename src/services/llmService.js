import fetch from "node-fetch";
import { readFileSync } from "fs";

const AGENTS_CONTENT = readFileSync("agents.md", "utf-8");

const API_URL = "http://127.0.0.1:8080/v1/chat/completions";

/**
 * Strips forgekeeper metadata from messages before sending to the LLM API.
 * The llama.cpp API only accepts { role, content } — extra properties cause rejection.
 */
export function prepareMessagesForAPI(messages) {
  return messages.map(msg => {
    const { forgekeeper, ...rest } = msg;
    return rest;
  });
}

export function buildSystemMessage(_mode) {
  const content = `
    You are an expert software engineer and technical writer.
    Your available modes are:
    [[ analyst ]]: As an analyst you never make changes but help the user analyze issues and plan future code.
    [[ implementor ]]: As an implementor you write new code while carefully following your guidelines.`
    + AGENTS_CONTENT;

  return content;
}

export async function callLLM(conversation) {
  try {
    
    const res = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen",
        max_tokens: 4096,
        top_p: 1,
        messages: prepareMessagesForAPI(conversation.messages),
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      conversation.error = `API error: ${res.status} - ${text}`;
      conversation.done = false;
      return;
    }

    const data = await res.json();
    if (data?.usage?.total_tokens) {
      conversation.tokensUsed = data.usage.total_tokens;
    }
    conversation.done = true;
    const content = data?.choices?.[0]?.message?.content ?? "[No response]";
    conversation.messages.push({ role: "assistant", content, forgekeeper: { mode: conversation.mode } });
  } catch (err) {
    conversation.error = err.message;
    conversation.done = false;
  }
}
