import { describe, it, expect, vi, beforeEach } from "vitest";

import { chat } from "../llm.js";

vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

const fetchModule = await import("node-fetch");

describe("message structure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "response" } }] }),
    });
  });

  it("should format user messages with content field for API", async () => {
    await chat([{ role: "user", text: "investigate this" }], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[1]).toEqual({
      role: "user",
      content: "investigate this",
    });
  });

  it("should format assistant messages with content field for API", async () => {
    await chat(
      [
        { role: "user", text: "hello" },
        { role: "assistant", text: "hi there" },
        { role: "user", text: "what can you do?" },
      ],
      {},
    );

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    // system + user + assistant + user = 4 messages
    expect(body.messages).toHaveLength(4);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[1]).toEqual({ role: "user", content: "hello" });
    expect(body.messages[2]).toEqual({ role: "assistant", content: "hi there" });
    expect(body.messages[3]).toEqual({ role: "user", content: "what can you do?" });
  });

  it("should merge existing system messages with config system prompt", async () => {
    await chat(
      [
        { role: "system", text: "Custom system" },
        { role: "user", text: "test" },
      ],
      {},
    );

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content).toContain("Custom system");
    expect(body.messages[0].content).toContain("You are an expert software engineer");
  });

  it("should send correct API request format", async () => {
    await chat([{ role: "user", text: "test" }], {});

    const call = fetchModule.default.mock.calls[0];

    expect(call[0]).toBe("http://127.0.0.1:8080/v1/chat/completions");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers).toEqual({ "Content-Type": "application/json" });

    const body = JSON.parse(call[1].body);
    expect(body.model).toBe("qwen");
    expect(body.max_tokens).toBe(4096);
    expect(body.top_p).toBe(1);
  });

  it("should prepend role label to first message with forgekeeper metadata", async () => {
    await chat([{ role: "user", text: "build this", forgekeeper: { role: "implementer" } }], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[1].role).toBe("user");
    expect(body.messages[1].content).toBe("[Role: implementer]\nbuild this");
  });

  it("should handle empty messages array", async () => {
    await chat([], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].role).toBe("system");
  });

 it("should include config system prompt", async () => {
    await chat([{ role: "user", text: "test" }], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].content).toContain("You are an expert software engineer");
  });
});
