import { getTokenizer } from "@anthropic-ai/tokenizer";

let tokenizer = null;
try {
  tokenizer = getTokenizer();
} catch {
  tokenizer = null;
}

export function estimateTokenCount(text) {
  if (tokenizer && typeof text === "string") {
    try {
      const tokens = tokenizer.encode(text);
      return tokens.length;
    } catch {
      // fall through to fallback
    }
  }
  return Math.ceil(text.length / 4);
}
