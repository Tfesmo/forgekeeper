import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref } from "vue";

import { useSseStream } from "./useSseStream.js";

describe("useSseStream", () => {
  let mockEventSource;
  let mockEvents;
  let mockClose;

  function createMockEventSource() {
    mockEvents = {};
    mockClose = vi.fn();
    mockEventSource = {
      addEventListener: vi.fn((event, cb) => {
        mockEvents[event] = cb;
      }),
      close: mockClose,
      fire: (event, data) => {
        mockEvents[event]?.({ data: JSON.stringify(data) });
      },
    };
    return mockEventSource;
  }

  beforeEach(() => {
    createMockEventSource();
    global.EventSource = class MockEventSource {
      constructor() {
        this.addEventListener = mockEventSource.addEventListener;
        this.close = mockEventSource.close;
        this.fire = mockEventSource.fire;
      }
    };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("llm-chunk appends to content of a matching assistant message", () => {
    const messages = ref([
      {
        role: "assistant",
        content: "",
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const { connect, isLoading } = useSseStream();
    connect("session-1", "analyst", () => {}, messages);

    expect(isLoading.value).toBe(true);
    mockEventSource.fire("llm-chunk", { seq: 1, content: "Hello" });

    expect(messages.value[0].content).toBe("Hello");
  });

  it("llm-reasoning appends to reasoning_content of a matching assistant message", () => {
    const messages = ref([
      {
        role: "assistant",
        content: "",
        reasoning_content: "",
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const { connect } = useSseStream();
    connect("session-1", "analyst", () => {}, messages);

    mockEventSource.fire("llm-reasoning", { seq: 1, content: "Thinking..." });

    expect(messages.value[0].reasoning_content).toBe("Thinking...");
  });

  it("new message created when no matching assistant message exists", () => {
    const messages = ref([]);
    const { connect } = useSseStream();
    connect("session-1", "analyst", () => {}, messages);

    mockEventSource.fire("llm-chunk", { seq: 1, content: "New content" });

    expect(messages.value.length).toBe(1);
    expect(messages.value[0].role).toBe("assistant");
    expect(messages.value[0].content).toBe("New content");
    expect(messages.value[0].forgekeeper.mode).toBe("analyst");
  });

  it("llm-done sets isLoading and hasActiveRequest to false, calls eventSource.close()", () => {
    const messages = ref([]);
    const { connect, isLoading, hasActiveRequest } = useSseStream();
    connect("session-1", "analyst", () => {}, messages);

    expect(isLoading.value).toBe(true);
    expect(hasActiveRequest.value).toBe(true);

    mockEventSource.fire("llm-done", { seq: 1 });

    expect(isLoading.value).toBe(false);
    expect(hasActiveRequest.value).toBe(false);
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("llm-error sets error and cleans up", () => {
    const messages = ref([]);
    const { connect, error, isLoading, hasActiveRequest } = useSseStream();
    connect("session-1", "analyst", () => {}, messages);

    mockEventSource.fire("llm-error", { seq: 1, error: "Something went wrong" });

    expect(error.value).toBe("Something went wrong");
    expect(isLoading.value).toBe(false);
    expect(hasActiveRequest.value).toBe(false);
    expect(mockEventSource.close).toHaveBeenCalled();
  });

  it("seq-based deduplication — events with seq <= lastSeq are silently skipped", () => {
    const messages = ref([
      {
        role: "assistant",
        content: "",
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const { connect } = useSseStream();
    connect("session-1", "analyst", () => {}, messages);

    // Send seq 1
    mockEventSource.fire("llm-chunk", { seq: 1, content: "First" });
    expect(messages.value[0].content).toBe("First");

    // Send seq 0 (older) — should be skipped
    mockEventSource.fire("llm-chunk", { seq: 0, content: "Skipped" });
    expect(messages.value[0].content).toBe("First");

    // Send seq 1 again (same) — should be skipped
    mockEventSource.fire("llm-chunk", { seq: 1, content: "Duplicate" });
    expect(messages.value[0].content).toBe("First");

    // Send seq 2 (newer) — should be applied
    mockEventSource.fire("llm-chunk", { seq: 2, content: "Second" });
    expect(messages.value[0].content).toBe("FirstSecond");
  });

  it("onMessage callback is invoked for each event", () => {
    const messages = ref([]);
    const onMessage = vi.fn();
    const { connect } = useSseStream();
    connect("session-1", "analyst", onMessage, messages);

    mockEventSource.fire("llm-chunk", { seq: 1, content: "test" });
    expect(onMessage).toHaveBeenCalledWith({ seq: 1, content: "test" });

    mockEventSource.fire("llm-reasoning", { seq: 2, content: "reason" });
    expect(onMessage).toHaveBeenLastCalledWith({ seq: 2, content: "reason" });
  });
});
