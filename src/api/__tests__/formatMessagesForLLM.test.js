import { describe, it, expect } from "vitest";

import { formatMessagesForLLM } from "../llm.js";

describe("formatMessagesForLLM", () => {
  it("should return messages with forgekeeper metadata stripped", () => {
    const messages = [
      { role: "user", text: "hello", forgekeeper: { role: "analyst" } },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[0].forgekeeper).toBeUndefined();
  });

  it("should prepend role label to first non-system message with forgekeeper metadata", () => {
    const messages = [
      { role: "system", text: "You are helpful.", forgekeeper: null },
      { role: "user", text: "test message", forgekeeper: { role: "analyst" } },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[1].content).toBe("[Role: analyst]\ntest message");
  });

  it("should not prepend anything when same role as previous forgekeeper message", () => {
    const messages = [
      { role: "system", text: "You are helpful.", forgekeeper: null },
      { role: "user", text: "first message", forgekeeper: { role: "analyst" } },
      { role: "assistant", text: "response", forgekeeper: null },
      { role: "user", text: "second message", forgekeeper: { role: "analyst" } },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[0].content).toBe("You are helpful.");
    expect(result[1].content).toBe("[Role: analyst]\nfirst message");
    expect(result[2].content).toBe("response");
    expect(result[3].content).toBe("second message");
  });

  it("should prepend role transition label when forgekeeper role changes", () => {
    const messages = [
      { role: "system", text: "You are helpful.", forgekeeper: null },
      { role: "user", text: "analyze this", forgekeeper: { role: "analyst" } },
      { role: "assistant", text: "here's my analysis", forgekeeper: null },
      { role: "user", text: "now implement it", forgekeeper: { role: "implementer" } },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[3].content).toBe("[Role Transition: analyst → implementer]\nnow implement it");
  });

  it("should handle messages without forgekeeper metadata", () => {
    const messages = [
      { role: "system", text: "You are helpful." },
      { role: "user", text: "hello" },
      { role: "assistant", text: "hi" },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[0].content).toBe("You are helpful.");
    expect(result[1].content).toBe("hello");
    expect(result[2].content).toBe("hi");
  });

  it("should treat system messages as role reset (next non-system gets role label)", () => {
    const messages = [
      { role: "system", text: "old system", forgekeeper: null },
      { role: "user", text: "first", forgekeeper: { role: "analyst" } },
      { role: "assistant", text: "response", forgekeeper: null },
      { role: "system", text: "new system", forgekeeper: null },
      { role: "user", text: "after reset", forgekeeper: { role: "implementer" } },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[0].content).toBe("old system");
    expect(result[1].content).toBe("[Role: analyst]\nfirst");
    expect(result[3].content).toBe("new system");
    expect(result[4].content).toBe("[Role: implementer]\nafter reset");
  });

  it("should handle empty array", () => {
    const result = formatMessagesForLLM([]);
    expect(result).toEqual([]);
  });

  it("should handle transition from no forgekeeper to forgekeeper role", () => {
    const messages = [
      { role: "system", text: "You are helpful.", forgekeeper: null },
      { role: "user", text: "no forgekeeper", forgekeeper: null },
      { role: "assistant", text: "response", forgekeeper: null },
      { role: "user", text: "now with forgekeeper", forgekeeper: { role: "analyst" } },
    ];
    const result = formatMessagesForLLM(messages);
    expect(result[1].content).toBe("no forgekeeper");
    expect(result[3].content).toBe("[Role: analyst]\nnow with forgekeeper");
  });
});
