import { get_encoding } from "tiktoken";

let tokenizer = null;
try {
  tokenizer = get_encoding("cl100k_base");
} catch {
  tokenizer = null;
}

export function estimateTokenCount(text) {
  if (!text || typeof text !== "string") return 0;
  if (tokenizer) {
    try {
      const tokens = tokenizer.encode(text);
      return tokens.length;
    } catch {
      // fall through to fallback
    }
  }
  return Math.ceil(text.length / 4);
}

export function estimateTokensForMessages(messages) {
  if (!Array.isArray(messages) || messages.length === 0) return 0;

  // Check the last assistant message for stored token count
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i];
    if (msg.role === "assistant" && msg.forgekeeper?.metrics?.usage?.total_tokens != null) {
      const storedTokenCount = msg.forgekeeper.metrics.usage.total_tokens;

      // Sum tokens from messages before the found one
      let priorTokens = 0;
      for (let j = 0; j < i; j++) {
        priorTokens += estimateTokenCount(messages[j].content || "");
        if (messages[j].reasoning_content) {
          priorTokens += estimateTokenCount(messages[j].reasoning_content);
        }
      }

      return storedTokenCount + priorTokens;
    }
  }

  // No stored token count found — estimate all messages
  let total = 0;
  for (const msg of messages) {
    total += estimateTokenCount(msg.content || "");
    if (msg.reasoning_content) {
      total += estimateTokenCount(msg.reasoning_content);
    }
  }
  return total;
}
