// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { ref } from "vue";

describe("useSseStream composable", () => {
  let eventSource;

  beforeEach(() => {
    vi.clearAllMocks();
    const handlers = {};

    // Shared mock instance — the constructor returns this same object
    eventSource = {
      url: null,
      _handlers: handlers,
      addEventListener: vi.fn((event, cb) => {
        handlers[event] = cb;
      }),
      get onerror() { return handlers.onerror; },
      set onerror(cb) { handlers.onerror = cb; },
      close: vi.fn(),
      mockFire: vi.fn((event, data) => {
        const fn = handlers[event];
        if (fn) fn({ data: JSON.stringify(data) });
      }),
      mockOnerror: vi.fn(() => {
        const fn = handlers.onerror;
        if (fn) fn();
      }),
      getHandlers: () => handlers,
    };

    class EventSourceMock {
      constructor(url) {
        this.url = url;
      }
    }
    Object.setPrototypeOf(EventSourceMock.prototype, eventSource);
    Object.defineProperty(globalThis, "EventSource", {
      value: EventSourceMock,
      writable: true,
      configurable: true,
    });
  });

  it("exports connect as a callable function", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();
    expect(typeof connect).toBe("function");
  });

  it("creates EventSource and registers listeners on connect", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();

    const messages = ref([]);
    connect("session-1", "analyst", () => {}, messages);

    const handlers = eventSource.getHandlers();
    expect(handlers["llm-chunk"]).toBeDefined();
    expect(handlers["llm-reasoning"]).toBeDefined();
    expect(handlers["llm-done"]).toBeDefined();
    expect(handlers["llm-error"]).toBeDefined();
    expect(handlers.onerror).toBeDefined();
  });

  it("appends content chunks to existing assistant message", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();

    const messages = ref([
      { role: "assistant", content: "", forgekeeper: { mode: "analyst" } },
    ]);

    connect("session-1", "analyst", () => {}, messages);

    eventSource.mockFire("llm-chunk", { seq: 1, content: "Hello" });
    expect(messages.value[0].content).toBe("Hello");

    eventSource.mockFire("llm-chunk", { seq: 2, content: " world" });
    expect(messages.value[0].content).toBe("Hello world");
  });

  it("appends reasoning chunks separately", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();

    const messages = ref([
      { role: "assistant", content: "", reasoning_content: "", forgekeeper: { mode: "analyst" } },
    ]);

    connect("session-1", "analyst", () => {}, messages);

    eventSource.mockFire("llm-reasoning", { seq: 1, content: "Thinking..." });
    expect(messages.value[0].reasoning_content).toBe("Thinking...");

    eventSource.mockFire("llm-reasoning", { seq: 2, content: " more" });
    expect(messages.value[0].reasoning_content).toBe("Thinking... more");
  });

  it("creates new assistant message when mode does not match", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();

    const messages = ref([
      { role: "assistant", content: "old", forgekeeper: { mode: "advisor" } },
    ]);

    connect("session-1", "analyst", () => {}, messages);

    eventSource.mockFire("llm-chunk", { seq: 1, content: "new" });
    expect(messages.value.length).toBe(2);
    expect(messages.value[0].content).toBe("old");
    expect(messages.value[1].role).toBe("assistant");
    expect(messages.value[1].forgekeeper.mode).toBe("analyst");
    expect(messages.value[1].content).toBe("new");
  });

  it("rejects out-of-order events via sequence number", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();

    const messages = ref([
      { role: "assistant", content: "", forgekeeper: { mode: "analyst" } },
    ]);

    connect("session-1", "analyst", () => {}, messages);

    eventSource.mockFire("llm-chunk", { seq: 5, content: "later" });
    expect(messages.value[0].content).toBe("later");

    eventSource.mockFire("llm-chunk", { seq: 3, content: "earlier" });
    expect(messages.value[0].content).toBe("later");
  });

  it("calls onMessage callback with event data", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect } = useSseStream();

    const messages = ref([]);
    const onMessage = vi.fn();
    connect("session-1", "analyst", onMessage, messages);

    eventSource.mockFire("llm-chunk", { seq: 1, content: "test" });
    expect(onMessage).toHaveBeenCalledWith({ seq: 1, content: "test" });
  });

  it("sets error state and closes EventSource on llm-error", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect, error } = useSseStream();

    const messages = ref([]);
    connect("session-1", "analyst", () => {}, messages);

    eventSource.mockFire("llm-error", { seq: 1, error: "something broke" });

    expect(error.value).toBe("something broke");
    expect(eventSource.close).toHaveBeenCalled();
  });

  it("disconnect closes the event source", async () => {
    const { useSseStream } = await import("./useSseStream.js");
    const { connect, disconnect } = useSseStream();

    connect("session-1", "analyst", () => {}, ref([]));

    disconnect();
    expect(eventSource.close).toHaveBeenCalled();
  });
});
