import { describe, it, expect, vi, beforeEach } from "vitest";

import { chat, estimateTokenCount, formatTokenUsage } from "../llm.js";

// Mock node-fetch
vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

const fetchModule = await import("node-fetch");

describe("llm.chat()", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call the correct API endpoint", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        choices: [{ message: { content: "Hello" } }, {}],
      }),
    });

    await chat([{ role: "user", text: "Hi" }], {});

    const call = fetchModule.default.mock.calls[0];
    expect(call[0]).toBe("http://127.0.0.1:8080/v1/chat/completions");
  });

  it("should send correct request body", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "test" } }] }),
    });

    await chat([{ role: "user", text: "test" }], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.model).toBe("qwen");
    expect(body.max_tokens).toBe(4096);
    expect(body.top_p).toBe(1);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("You are an expert software engineer");
    expect(body.messages[0].content).toContain("--- agents.md ---");
    expect(body.messages[1]).toEqual({
      role: "user",
      content: "test",
    });
  });

  it("should use config system prompt when settings are undefined", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "test" } }] }),
    });

    await chat([{ role: "user", text: "hi" }], undefined);

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("You are an expert software engineer");
    expect(body.messages[0].content).toContain("--- agents.md ---");
  });

  it("should parse response correctly", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        choices: [
          {
            message: { role: "assistant", content: "AI response text" },
          },
        ],
      }),
    });

    const result = await chat([{ role: "user", text: "hi" }], {});
    expect(result).toBe("AI response text");
  });

  it("should return '[No response]' when choices is empty", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [] }),
    });

    const result = await chat([{ role: "user", text: "hi" }], {});
    expect(result).toBe("[No response]");
  });

  it("should return '[No response]' when message content is missing", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({
        choices: [{ message: { role: "assistant" } }],
      }),
    });

    const result = await chat([{ role: "user", text: "hi" }], {});
    expect(result).toBe("[No response]");
  });

  it("should throw on API error with response body", async () => {
    fetchModule.default.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({}),
      text: async () => JSON.stringify({ error: "server error" }),
    });

    await expect(chat([], {})).rejects.toThrow(
      'API error: 500 Internal Server Error - {"error":"server error"}',
    );
  });

  it("should append agents.md content to the system prompt", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "test" } }] }),
    });

    await chat([{ role: "user", text: "test" }], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("You are an expert software engineer");
    expect(body.messages[0].content).toContain("--- agents.md ---");
    // agents.md file exists and has content
    expect(body.messages[0].content.length).toBeGreaterThan(100);
  });

  it("should merge existing system prompt with config system prompt", async () => {
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "test" } }] }),
    });

    await chat(
      [
        { role: "system", text: "Custom system prompt" },
        { role: "user", text: "test" },
      ],
      {},
    );

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages).toHaveLength(2);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("You are an expert software engineer");
    expect(body.messages[0].content).toContain("Custom system prompt");
    expect(body.messages[0].content).toContain("--- agents.md ---");
    expect(body.messages[1]).toEqual({ role: "user", content: "test" });
  });
});

describe("loadAgentsMd", () => {
  it("should return agents.md content truncated to maxChars", async () => {
    vi.resetModules();

    vi.doMock("node:fs/promises", () => ({
      default: {
        readFile: async () => "x".repeat(200),
      },
    }));

    const { loadAgentsMd } = await import("../llm.js");
    const result = await loadAgentsMd("/test/path", 50);
    expect(result).toBe("x".repeat(50));
  });

  it("should return empty string when file doesn't exist", async () => {
    vi.resetModules();

    vi.doMock("node:fs/promises", () => ({
      default: {
        readFile: async () => {
          throw new Error("ENOENT: no such file or directory");
        },
      },
    }));

    const { loadAgentsMd } = await import("../llm.js");
    const result = await loadAgentsMd("/nonexistent/path", 100);
    expect(result).toBe("");
  });
});

describe("estimateTokenCount", () => {
  it("should estimate tokens using character / 4 heuristic", () => {
    const messages = [
      { role: "user", text: "Hello world" },
      { role: "assistant", text: "Hi there!" },
    ];

    // "Hello world" = 11 chars, "Hi there!" = 9 chars, total = 20 chars
    // 20 / 4 = 5 tokens
    expect(estimateTokenCount(messages)).toBe(5);
  });

  it("should handle empty messages", () => {
    expect(estimateTokenCount([])).toBe(0);
  });

  it("should handle messages with empty text", () => {
    const messages = [
      { role: "user", text: "" },
      { role: "assistant", text: "" },
    ];
    expect(estimateTokenCount(messages)).toBe(0);
  });

  it("should round up for non-integer results", () => {
    const messages = [{ role: "user", text: "Hello" }];
    // "Hello" = 5 chars, 5 / 4 = 1.25, ceil = 2
    expect(estimateTokenCount(messages)).toBe(2);
  });
});

describe("formatTokenUsage", () => {
  it("should format token usage as 'used/limit (percentage)%'", () => {
    expect(formatTokenUsage(16000, 64000)).toBe("16.0k/64.0k (25%)");
  });

  it("should display usage with one decimal for k values", () => {
    expect(formatTokenUsage(32500, 64000)).toBe("32.5k/64.0k (51%)");
  });

  it("should handle 0 tokens", () => {
    expect(formatTokenUsage(0, 64000)).toBe("0/64.0k (0%)");
  });

  it("should handle 100% usage", () => {
    expect(formatTokenUsage(64000, 64000)).toBe("64.0k/64.0k (100%)");
  });

  it("should handle usage exceeding limit", () => {
    expect(formatTokenUsage(80000, 64000)).toBe("80.0k/64.0k (125%)");
  });

  it("should handle values less than 1k", () => {
    expect(formatTokenUsage(500, 64000)).toBe("500/64.0k (1%)");
  });
});
