import { describe, it, expect, vi, beforeEach } from "vitest";

describe("callLLM", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("should include a single system message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response content" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("advisor");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    const messages = [{ role: "user", content: "Hello" }];

    conversation.messages = conversation.messages.concat(messages);

    await callLLM(conversation);

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.messages.length).toBe(2);
    expect(callBody.messages[0].role).toBe("system");
    expect(callBody.messages[0].content).toContain("expert software engineer");
    expect(callBody.messages[0].content).toContain("analyst");
    expect(callBody.messages[0].content).toContain("implementor");
    expect(callBody.messages[1].role).toBe("user");
  });

  it("should include user messages after the system message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "First" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("architect");
    const messages = [
      { role: "user", content: "First message" },
      { role: "assistant", content: "First response" },
      { role: "user", content: "Second message" },
    ];

    await callLLM({
      messages: [{ role: "system", content: systemContent }, ...messages],
      done: false,
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.messages.length).toBe(4);
    expect(callBody.messages[0].role).toBe("system");
    expect(callBody.messages[1].role).toBe("user");
    expect(callBody.messages[1].content).toBe("First message");
    expect(callBody.messages[2].role).toBe("assistant");
    expect(callBody.messages[2].content).toBe("First response");
    expect(callBody.messages[3].role).toBe("user");
    expect(callBody.messages[3].content).toBe("Second message");
  });

  it("should call the API with correct parameters", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response content" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("implementer");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8080/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.model).toBe("qwen");
    expect(callBody.max_tokens).toBe(4096);
    expect(callBody.top_p).toBe(1);
  });

  it("should mark conversation as done on success", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response content" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("reviewer");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };

    await callLLM(conversation);

    expect(conversation.done).toBe(true);
  });

  it("should append assistant response to conversation.messages", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Assistant reply" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = {
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: "Hello" },
      ],
      done: false,
    };

    await callLLM(conversation);

    expect(conversation.messages.length).toBe(3);
    expect(conversation.messages[0].role).toBe("system");
    expect(conversation.messages[0].content).toContain("expert software engineer");
    expect(conversation.messages[0].content).toContain("analyst");
    expect(conversation.messages[1].role).toBe("user");
    expect(conversation.messages[1].content).toBe("Hello");
    expect(conversation.messages[2].role).toBe("assistant");
    expect(conversation.messages[2].content).toBe("Assistant reply");
  });

  it("should set error on API error response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "Bad gateway",
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("advisor");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.error).toBe("API error: 502 - Bad gateway");
    expect(conversation.done).toBe(false);
  });

  it("should set error on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("architect");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.error).toBe("Network error");
    expect(conversation.done).toBe(false);
  });

  it("should handle missing response content gracefully", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ choices: [] }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("implementer");
    const conversation = {
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: "Hello" },
      ],
      done: false,
    };

    await callLLM(conversation);

    expect(conversation.done).toBe(true);
    expect(conversation.messages[2].content).toBe("[No response]");
  });

  it("should select first choice when multiple choices are returned", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "First choice" } },
          { message: { content: "Second choice" } },
          { message: { content: "Third choice" } },
        ],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("reviewer");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.messages.length).toBe(2);
    expect(conversation.messages[1].content).toBe("First choice");
  });

  it("should handle conversation with only system message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Starter response" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.messages.length).toBe(1);
    expect(callBody.messages[0].role).toBe("system");
    expect(conversation.messages.length).toBe(2);
    expect(conversation.messages[1].content).toBe("Starter response");
  });

  it("should only have one system message in the request", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("advisor");
    const messages = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Reply" },
    ];

    await callLLM({
      messages: [{ role: "system", content: systemContent }, ...messages],
      done: false,
    });

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    const systemMessageCount = callBody.messages.filter((m) => m.role === "system").length;
    expect(systemMessageCount).toBe(1);
  });

  it("should strip forgekeeper metadata before sending to the API", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage, prepareMessagesForAPI } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = {
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: "Hello", forgekeeper: { mode: "analyst" } },
        { role: "assistant", content: "Hi there", forgekeeper: { mode: "analyst" } },
      ],
      done: false,
    };

    await callLLM(conversation);

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.messages.length).toBe(3);
    for (const msg of callBody.messages) {
      expect(msg).not.toHaveProperty("forgekeeper");
      expect(msg).toHaveProperty("role");
      expect(msg).toHaveProperty("content");
    }
  });

  it("should include reasoning_content and metrics in assistant message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [
          { message: { content: "Answer", reasoning_content: "Thinking step by step..." } },
        ],
        usage: { completion_tokens: 100, prompt_tokens: 50, total_tokens: 150 },
        timings: { predicted_ms: 500, predicted_per_second: 10 },
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.messages[1].reasoning_content).toBe("Thinking step by step...");
    expect(conversation.messages[1].forgekeeper.metrics.usage.total_tokens).toBe(150);
    expect(conversation.messages[1].forgekeeper.metrics.timings.predicted_ms).toBe(500);
  });

  it("should set reasoning_content and metrics to null when not present", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Answer" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.messages[1].reasoning_content).toBe(null);
    expect(conversation.messages[1].forgekeeper.metrics.usage).toBe(null);
    expect(conversation.messages[1].forgekeeper.metrics.timings).toBe(null);
  });

  it("should preserve original messages without mutation", async () => {
    vi.doMock("node-fetch", () => ({ default: vi.fn() }));
    const { prepareMessagesForAPI } = await import("./llmService.js");

    const messages = [
      { role: "system", content: "You are an assistant" },
      { role: "user", content: "Hello", forgekeeper: { mode: "analyst" } },
      { role: "assistant", content: "Hi", forgekeeper: { mode: "analyst" } },
    ];

    const result = prepareMessagesForAPI(messages);

    expect(result).toEqual([
      { role: "system", content: "You are an assistant" },
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ]);
    expect(messages[1]).toHaveProperty("forgekeeper");
    expect(messages[2]).toHaveProperty("forgekeeper");
  });

  it("should not mutate the original user messages", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response" } }],
      }),
    });

    vi.doMock("node-fetch", () => ({ default: fetchMock }));
    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    const originalMessages = [{ role: "user", content: "Hello" }];

    conversation.messages = conversation.messages.concat(originalMessages);
    await callLLM(conversation);

    expect(originalMessages).toEqual([{ role: "user", content: "Hello" }]);
    expect(originalMessages.length).toBe(1);
  });
});
