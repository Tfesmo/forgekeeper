import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("callLLM", () => {
  const originalFetch = global.fetch;
  const originalAbortSignalAny = global.AbortSignal?.any;

  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("should include a single system message", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: "Response content" } }],
      }),
    });
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("advisor");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.error).toBe("API error: 502 - Bad gateway");
    expect(conversation.done).toBe(false);
  });

  it("should set error on network failure", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Network error"));
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

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
    global.fetch = fetchMock;

    const { callLLM, buildSystemMessage } = await import("./llmService.js");

    const systemContent = buildSystemMessage("analyst");
    const conversation = { messages: [{ role: "system", content: systemContent }], done: false };
    await callLLM(conversation);

    expect(conversation.messages[1].reasoning_content).toBe(null);
    expect(conversation.messages[1].forgekeeper.metrics.usage).toBe(null);
    expect(conversation.messages[1].forgekeeper.metrics.timings).toBe(null);
  });

  it("should preserve original messages without mutation", async () => {
    global.fetch = vi.fn();

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
    global.fetch = fetchMock;

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

describe("callLLMStreaming", () => {
  const originalFetch = global.fetch;
  const originalSessionDir = process.env.SESSION_DIR;
  const sessionDir = path.join(os.tmpdir(), `forgekeeper-test-${Date.now()}`);

  beforeEach(() => {
    vi.resetModules();
    global.fetch = vi.fn();
    process.env.SESSION_DIR = sessionDir;
    process.env.LOG_STREAM = "false";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.SESSION_DIR;
    process.env.SESSION_DIR = originalSessionDir;
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  function makeSSEChunk(deltaContent, type) {
    if (type === "content") {
      return `data:{"choices":[{"delta":{"content":"${deltaContent}"}}]}\n\n`;
    }
    return `data:{"choices":[{"delta":{"reasoning_content":"${deltaContent}"}}]}\n\n`;
  }

  function makeSSEFinal(usage, timings) {
    const obj = { choices: [{ delta: {} }] };
    if (usage) obj.usage = usage;
    if (timings) obj.timings = timings;
    return `data:${JSON.stringify(obj)}\n\n`;
  }

  function makeStream(sseChunks) {
    const body = sseChunks.join("") + "data: [DONE]\n\n";
    const encoder = new TextEncoder();
    const encoded = encoder.encode(body);
    let idx = 0;
    return {
      ok: true,
      body: {
        getReader: () => ({
          read: () => {
            if (idx < encoded.length) {
              const chunkSize = Math.min(1024, encoded.length - idx);
              const chunk = encoded.slice(idx, idx + chunkSize);
              idx += chunkSize;
              return Promise.resolve({ value: chunk, done: false });
            }
            return Promise.resolve({ value: undefined, done: true });
          },
        }),
      },
    };
  }

  function makeSlowStream(sseChunks, delayMs) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const body = sseChunks.join("") + "data: [DONE]\n\n";
        const encoder = new TextEncoder();
        const encoded = encoder.encode(body);
        let idx = 0;
        resolve({
          ok: true,
          body: {
            getReader: () => ({
              read: () => {
                if (idx < encoded.length) {
                  const chunkSize = Math.min(1024, encoded.length - idx);
                  const chunk = encoded.slice(idx, idx + chunkSize);
                  idx += chunkSize;
                  return Promise.resolve({ value: chunk, done: false });
                }
                return Promise.resolve({ value: undefined, done: true });
              },
            }),
          },
        });
      }, delayMs || 50);
    });
  }

  function writeSessionToDisk(sessionId, session) {
    fs.mkdirSync(sessionDir, { recursive: true });
    fs.writeFileSync(path.join(sessionDir, `${sessionId}.json`), JSON.stringify(session));
  }

  it("should call the API with stream: true", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(makeStream([]));
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = {
      id: "session-1",
      mode: "analyst",
      messages: [{ role: "user", content: "Hello" }],
    };
    await callLLMStreaming(session, new AbortController().signal, () => {});

    const callBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(callBody.stream).toBe(true);
    expect(callBody.model).toBe("qwen");
  });

  it("should invoke onChunk for each content chunk", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeStream([makeSSEChunk("Hello", "content"), makeSSEChunk(" world", "content")]),
      );
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = { id: "s1", mode: "analyst", messages: [] };
    writeSessionToDisk("s1", session);
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    expect(onChunk).toHaveBeenCalledWith("Hello", "content");
    expect(onChunk).toHaveBeenCalledWith(" world", "content");
  });

  it("should invoke onChunk for reasoning chunks", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeStream([
          makeSSEChunk("Thinking...", "reasoning"),
          makeSSEChunk(" step by step", "reasoning"),
        ]),
      );
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = { id: "s1", mode: "analyst", messages: [] };
    writeSessionToDisk("s1", session);
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    expect(onChunk).toHaveBeenCalledWith("Thinking...", "reasoning");
    expect(onChunk).toHaveBeenCalledWith(" step by step", "reasoning");
  });

  it("should finalize session with assembled assistant message", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeStream([makeSSEChunk("Hello", "content"), makeSSEChunk(" world", "content")]),
      );
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = {
      id: "s1",
      mode: "analyst",
      messages: [],
      done: false,
    };
    writeSessionToDisk("s1", session);
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    const persisted = JSON.parse(fs.readFileSync(path.join(sessionDir, "s1.json"), "utf-8"));
    expect(persisted.done).toBe(true);
    expect(persisted.error).toBeUndefined();
    expect(persisted.abortController).toBeUndefined();

    const lastMsg = persisted.messages[persisted.messages.length - 1];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.content).toBe("Hello world");
  });

  it("should handle reasoning then content chunks in order", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeStream([
          makeSSEChunk("Thinking...", "reasoning"),
          makeSSEChunk("Hello", "content"),
          makeSSEChunk(" world", "content"),
        ]),
      );
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = { id: "s1", mode: "analyst", messages: [] };
    writeSessionToDisk("s1", session);
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    expect(onChunk.mock.calls[0][0]).toBe("Thinking...");
    expect(onChunk.mock.calls[0][1]).toBe("reasoning");
    expect(onChunk.mock.calls[1][0]).toBe("Hello");
    expect(onChunk.mock.calls[1][1]).toBe("content");
    expect(onChunk.mock.calls[2][0]).toBe(" world");
    expect(onChunk.mock.calls[2][1]).toBe("content");
  });

  it("should set error on API error response", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      text: async () => "Bad gateway",
    });
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = {
      id: "s1",
      mode: "analyst",
      messages: [],
      done: false,
    };
    writeSessionToDisk("s1", session);
    try {
      await callLLMStreaming(session, new AbortController().signal, onChunk);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err.message).toBe("API error: 502 - Bad gateway");
      const persisted = JSON.parse(fs.readFileSync(path.join(sessionDir, "s1.json"), "utf-8"));
      expect(persisted.error).toBe("API error: 502 - Bad gateway");
      expect(persisted.done).toBe(false);
    }
  });

  it("should handle network failure", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("Network timeout"));
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = {
      id: "s1",
      mode: "analyst",
      messages: [],
      done: false,
    };
    writeSessionToDisk("s1", session);
    try {
      await callLLMStreaming(session, new AbortController().signal, onChunk);
      expect.fail("should have thrown");
    } catch (err) {
      expect(err.message).toBe("Network timeout");
      const persisted = JSON.parse(fs.readFileSync(path.join(sessionDir, "s1.json"), "utf-8"));
      expect(persisted.error).toBe("Network timeout");
      expect(persisted.done).toBe(false);
    }
  });

  it("should handle abort signal", async () => {
    const onChunk = vi.fn();
    let aborted = false;

    const fetchMock = vi.fn().mockImplementation(() => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve(makeStream([makeSSEChunk("Hello", "content")]));
        }, 10);
      });
    });
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const controller = new AbortController();
    const session = {
      id: "s1",
      mode: "analyst",
      messages: [],
      done: false,
    };
    writeSessionToDisk("s1", session);

    // Abort immediately
    setTimeout(() => {
      controller.abort();
      aborted = true;
    }, 10);

    await callLLMStreaming(session, controller.signal, onChunk);

    expect(aborted).toBe(true);
    const persisted = JSON.parse(fs.readFileSync(path.join(sessionDir, "s1.json"), "utf-8"));
    expect(persisted.done).toBe(true);
    const lastMsg = persisted.messages[persisted.messages.length - 1];
    expect(lastMsg.role).toBe("assistant");
    expect(lastMsg.content).toBe("");
  });

  it("should capture usage and timings from the last chunk", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        makeStream([
          makeSSEChunk("Hello", "content"),
          makeSSEFinal(
            { completion_tokens: 10, prompt_tokens: 5, total_tokens: 15 },
            { predicted_ms: 200 },
          ),
        ]),
      );
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = { id: "s1", mode: "analyst", messages: [] };
    writeSessionToDisk("s1", session);
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    const persisted = JSON.parse(fs.readFileSync(path.join(sessionDir, "s1.json"), "utf-8"));
    const lastMsg = persisted.messages[persisted.messages.length - 1];
    expect(lastMsg.forgekeeper.metrics.usage.total_tokens).toBe(15);
    expect(lastMsg.forgekeeper.metrics.timings.predicted_ms).toBe(200);
  });

  it("should handle empty stream (only [DONE])", async () => {
    const onChunk = vi.fn();
    const fetchMock = vi.fn().mockResolvedValueOnce(makeStream([]));
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = { id: "s1", mode: "analyst", messages: [] };
    writeSessionToDisk("s1", session);
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    expect(onChunk).not.toHaveBeenCalled();
    const persisted = JSON.parse(fs.readFileSync(path.join(sessionDir, "s1.json"), "utf-8"));
    expect(persisted.messages.length).toBeGreaterThan(0);
    const lastMsg = persisted.messages[persisted.messages.length - 1];
    expect(lastMsg.content).toBe("");
    expect(lastMsg.reasoning_content).toBe(null);
  });

  it("should skip malformed JSON chunks gracefully", async () => {
    const onChunk = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const sseBody =
      "data: {invalid json}\n\n" +
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n' +
      "data: [DONE]\n\n";

    const encoder = new TextEncoder();
    const encoded = encoder.encode(sseBody);
    let idx = 0;
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      body: {
        getReader: () => ({
          read: () => {
            if (idx < encoded.length) {
              const chunkSize = Math.min(1024, encoded.length - idx);
              const chunk = encoded.slice(idx, idx + chunkSize);
              idx += chunkSize;
              return Promise.resolve({ value: chunk, done: false });
            }
            return Promise.resolve({ value: undefined, done: true });
          },
        }),
      },
    });
    global.fetch = fetchMock;

    const { callLLMStreaming } = await import("./llmService.js");

    const session = { id: "s1", mode: "analyst", messages: [] };
    await callLLMStreaming(session, new AbortController().signal, onChunk);

    expect(onChunk).toHaveBeenCalledWith("Hello", "content");
    consoleErrorSpy.mockRestore();
  });
});
