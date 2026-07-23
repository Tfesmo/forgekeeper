import { describe, it, expect } from "vitest";

import { estimateTokenCount, estimateTokensForMessages } from "./tokenizer.js";

describe("estimateTokenCount", () => {
  it("returns a positive number for non-empty strings", () => {
    const result = estimateTokenCount("hello world");
    expect(result).toBeGreaterThan(0);
  });

  it("returns 0 for empty string", () => {
    const result = estimateTokenCount("");
    expect(result).toBe(0);
  });

  it("returns 0 for non-string input", () => {
    const result = estimateTokenCount(null);
    expect(result).toBe(0);
  });
});

describe("estimateTokensForMessages", () => {
  it("returns 0 for empty array", () => {
    const result = estimateTokensForMessages([]);
    expect(result).toBe(0);
  });

  it("returns 0 for non-array input", () => {
    const result = estimateTokensForMessages(null);
    expect(result).toBe(0);
  });

  it("uses stored token count from last assistant message", () => {
    const messages = [
      { role: "user", content: "hello" },
      {
        role: "assistant",
        content: "hi there",
        forgekeeper: { metrics: { usage: { total_tokens: 42 } } },
      },
    ];
    const result = estimateTokensForMessages(messages);
    expect(result).toBeGreaterThan(42);
  });

  it("scans backwards for stored token count", () => {
    const messages = [
      { role: "user", content: "hello" },
      { role: "assistant", content: "hi" },
      { role: "user", content: "more" },
      {
        role: "assistant",
        content: "response",
        forgekeeper: { metrics: { usage: { total_tokens: 10 } } },
      },
    ];
    const result = estimateTokensForMessages(messages);
    expect(result).toBeGreaterThan(10);
  });

  it("estimates all tokens when no stored count exists", () => {
    const messages = [
      { role: "user", content: "hello world" },
      { role: "assistant", content: "response text" },
    ];
    const result = estimateTokensForMessages(messages);
    expect(result).toBeGreaterThan(0);
  });

  it("includes reasoning_content in estimation", () => {
    const messages = [
      {
        role: "assistant",
        content: "hello",
        reasoning_content: "some reasoning content that should be counted",
      },
    ];
    const result = estimateTokensForMessages(messages);
    const singleContentResult = estimateTokensForMessages([
      { role: "assistant", content: "hello" },
    ]);
    expect(result).toBeGreaterThan(singleContentResult);
  });
});
