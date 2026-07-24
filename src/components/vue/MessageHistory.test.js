// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ref, reactive, nextTick } from "vue";
import { render } from "@testing-library/vue";
import MessageHistory from "./MessageHistory.vue";

describe("MessageHistory.vue", () => {
  let originalSetInterval;
  let originalClearInterval;
  let intervalCallbacks = [];

  beforeEach(() => {
    intervalCallbacks = [];
    originalSetInterval = globalThis.setInterval;
    originalClearInterval = globalThis.clearInterval;

    globalThis.setInterval = (fn, _delay) => {
      const id = intervalCallbacks.length;
      intervalCallbacks.push(fn);
      return id;
    };

    globalThis.clearInterval = (id) => {
      intervalCallbacks[id] = null;
    };
  });

  afterEach(() => {
    globalThis.setInterval = originalSetInterval;
    globalThis.clearInterval = originalClearInterval;
  });

  it("freezes elapsedMs when isStreaming transitions from true to false", async () => {
    const messages = reactive([
      {
        role: "assistant",
        content: "",
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const isStreaming = ref(false);

    const { container, rerender } = render(MessageHistory, {
      props: { messages, isStreaming: false, currentMode: "analyst" },
      attachTo: document.body,
    });

    // Start streaming
    rerender({ messages, isStreaming: true, currentMode: "analyst" });
    await nextTick();

    // Simulate 100ms of elapsed time
    for (let i = 0; i < 10; i++) {
      if (intervalCallbacks[0]) {
        intervalCallbacks[0]();
        await nextTick();
      }
    }

    // Verify thinking timer shows elapsed time while streaming
    const thinkingTimer = container.querySelector(".thinking-timer");
    expect(thinkingTimer).toBeTruthy();
    expect(thinkingTimer.textContent).toBe("100ms");

    // Stop streaming and populate content/reasoning so thought indicator shows
    messages[0].reasoning_content = "Thinking...";
    messages[0].content = "Hello";
    rerender({ messages, isStreaming: false, currentMode: "analyst" });
    await nextTick();

    // Thought timer should show the frozen time, not "0ms"
    const thoughtTimer = container.querySelector(".thought-timer");
    expect(thoughtTimer).toBeTruthy();
    expect(thoughtTimer.textContent).toBe("100ms");
  });

  it("does not display thought indicator when message has no reasoning_content", async () => {
    const messages = reactive([
      {
        role: "assistant",
        content: "Hello",
        reasoning_content: null,
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const isStreaming = ref(false);

    const { container } = render(MessageHistory, {
      props: { messages, isStreaming: false, currentMode: "analyst" },
      attachTo: document.body,
    });

    const thoughtInline = container.querySelector(".thought-inline");
    expect(thoughtInline).toBeNull();
  });

  it("does not display thought indicator when content is empty", async () => {
    const messages = reactive([
      {
        role: "assistant",
        content: "",
        reasoning_content: "Thinking...",
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const isStreaming = ref(false);

    const { container } = render(MessageHistory, {
      props: { messages, isStreaming: false, currentMode: "analyst" },
      attachTo: document.body,
    });

    const thoughtInline = container.querySelector(".thought-inline");
    expect(thoughtInline).toBeNull();
  });

  it("displays thought indicator when message has both reasoning_content and content", async () => {
    const messages = reactive([
      {
        role: "assistant",
        content: "Hello",
        reasoning_content: "Thinking...",
        forgekeeper: { mode: "analyst" },
      },
    ]);
    const isStreaming = ref(false);

    const { container } = render(MessageHistory, {
      props: { messages, isStreaming: false, currentMode: "analyst" },
      attachTo: document.body,
    });

    const thoughtInline = container.querySelector(".thought-inline");
    expect(thoughtInline).toBeTruthy();
  });
});
