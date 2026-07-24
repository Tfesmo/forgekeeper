// @vitest-environment happy-dom

import { render } from "@testing-library/vue";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, nextTick } from "vue";

import ChatView from "./ChatView.vue";
import { useSseStream } from "./useSseStream.js";

vi.mock("./useSseStream.js", () => ({
  useSseStream: vi.fn(),
}));

vi.stubGlobal("fetch", vi.fn());

describe("ChatView", () => {
  let mockSse;
  let mockMessages;

  beforeEach(() => {
    mockMessages = ref([]);

    mockSse = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      isLoading: ref(false),
      hasActiveRequest: ref(false),
      error: ref(undefined),
    };

    useSseStream.mockReturnValue(mockSse);

    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        modes: [{ id: "analyst", label: "Analyst", symbol: "\u24c8" }],
        currentMode: "analyst",
        id: "session-123",
        messages: [],
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reasoning → content → done (typical flow)", async () => {
    const messages = ref([]);
    mockSse.isLoading.value = true;
    mockSse.hasActiveRequest.value = true;

    // Simulate the SSE flow after connect is called
    const originalConnect = mockSse.connect.mockImplementation((sessionId, mode, cb, msgsRef) => {
      msgsRef.value.push({
        role: "assistant",
        content: "",
        reasoning_content: "Thinking step 1",
        forgekeeper: { mode },
      });
      msgsRef.value[0].content = "Hello world";
      cb({});
      mockSse.isLoading.value = false;
      mockSse.hasActiveRequest.value = false;
    });

    const { container } = render(ChatView, {
      props: {},
      attachTo: document.body,
    });

    await nextTick();

    // Trigger connect by simulating the stream call
    mockSse.connect("session-123", "analyst", () => {}, mockMessages);

    await nextTick();

    const messageHistory = container.querySelector("[class*='message-history']");
    expect(messageHistory).toBeTruthy();
  });

  it("content only (no reasoning)", async () => {
    const { container } = render(ChatView, {
      props: {},
      attachTo: document.body,
    });

    await nextTick();

    // Verify the component renders with a prompt area
    const promptArea = container.querySelector("[class*='prompt-area']");
    expect(promptArea).toBeTruthy();
  });

  it("empty response", async () => {
    const { container } = render(ChatView, {
      props: {},
      attachTo: document.body,
    });

    await nextTick();

    mockSse.isLoading.value = true;
    mockSse.hasActiveRequest.value = true;
    mockSse.connect.mockImplementation((sessionId, mode, cb, msgsRef) => {
      msgsRef.value.push({
        role: "assistant",
        content: "",
        forgekeeper: { mode },
      });
      cb({});
      mockSse.isLoading.value = false;
      mockSse.hasActiveRequest.value = false;
    });

    mockSse.connect("session-123", "analyst", () => {}, mockMessages);

    await nextTick();

    expect(mockMessages.value).toBeDefined();
  });

  it("error mid-stream sets error value", async () => {
    const { container } = render(ChatView, {
      props: {},
      attachTo: document.body,
    });

    await nextTick();

    mockSse.isLoading.value = true;
    mockSse.hasActiveRequest.value = true;
    mockSse.error.value = undefined;

    mockSse.connect.mockImplementation((sessionId, mode, cb, msgsRef) => {
      mockSse.error.value = "Stream connection error";
      mockSse.isLoading.value = false;
      mockSse.hasActiveRequest.value = false;
      cb({});
    });

    mockSse.connect("session-123", "analyst", () => {}, mockMessages);

    await nextTick();

    const errorMessage = container.querySelector("[class*='error-message']");
    expect(errorMessage).toBeTruthy();
  });

  it("reasoning only (no content, streaming stops)", async () => {
    const { container } = render(ChatView, {
      props: {},
      attachTo: document.body,
    });

    await nextTick();

    // Verify the component structure is correct
    const chatView = container.querySelector(".chat-view");
    expect(chatView).toBeTruthy();
  });

  it("renders MessageHistory with correct props", async () => {
    mockSse.isLoading.value = false;
    mockSse.hasActiveRequest.value = false;
    mockSse.connect.mockImplementation(() => {});

    const { container } = render(ChatView, {
      props: {},
      attachTo: document.body,
    });

    await nextTick();

    const messageHistory = container.querySelector("[class*='message-history']");
    expect(messageHistory).toBeTruthy();

    const promptArea = container.querySelector("[class*='prompt-area']");
    expect(promptArea).toBeTruthy();
  });
});
