import { ref, readonly } from "vue";

import { debug } from "../../utils/debug.js";

export function useSseStream() {
  const isLoading = ref(false);
  const hasActiveRequest = ref(false);
  const error = ref(undefined);
  const lastMessage = ref(null);

  let eventSource = null;
  let sessionId = null;

  const state = readonly({
    get isLoading() {
      return isLoading.value;
    },
    get hasActiveRequest() {
      return hasActiveRequest.value;
    },
    get error() {
      return error.value;
    },
    get lastMessage() {
      return lastMessage.value;
    },
  });

  function connect(sessionIdParam, mode, onMessage, messagesRef) {
    sessionId = sessionIdParam;
    isLoading.value = true;
    hasActiveRequest.value = true;
    error.value = undefined;
    let lastSeq = 0;

    function appendChunk(content, type) {
      const msgs = messagesRef.value;
      const lastMsg = msgs[msgs.length - 1];

      if (lastMsg && lastMsg.role === "assistant" && lastMsg.forgekeeper?.mode === mode) {
        if (type === "reasoning") {
          lastMsg.reasoning_content = (lastMsg.reasoning_content || "") + content;
        } else {
          lastMsg.content = (lastMsg.content || "") + content;
        }
      } else {
        msgs.push({
          role: "assistant",
          content: type === "reasoning" ? "" : content,
          reasoning_content: type === "reasoning" ? content : undefined,
          forgekeeper: { mode },
        });
      }
      lastMessage.value = msgs[msgs.length - 1];
    }

    eventSource = new EventSource(`/api/session/${sessionId}/stream`);

    eventSource.addEventListener("llm-chunk", (e) => {
      const data = JSON.parse(e.data);
      if (data.seq <= lastSeq) return;
      lastSeq = data.seq;
      appendChunk(data.content, "content");
      onMessage?.(data);
    });

    eventSource.addEventListener("llm-reasoning", (e) => {
      const data = JSON.parse(e.data);
      if (data.seq <= lastSeq) return;
      lastSeq = data.seq;
      appendChunk(data.content, "reasoning");
      onMessage?.(data);
    });

    eventSource.addEventListener("llm-done", (e) => {
      const data = JSON.parse(e.data);
      debug.vue(
        "llm-done fired, isLoading: %s, hasActiveRequest: %s",
        isLoading.value,
        hasActiveRequest.value,
      );
      if (data.seq <= lastSeq) return;
      lastSeq = data.seq;
      onMessage?.(data);
      isLoading.value = false;
      hasActiveRequest.value = false;
      eventSource.close();
    });

    eventSource.addEventListener("llm-error", (e) => {
      const data = JSON.parse(e.data);
      if (data.seq <= lastSeq) return;
      lastSeq = data.seq;
      error.value = data.error;
      isLoading.value = false;
      hasActiveRequest.value = false;
      eventSource.close();
      onMessage?.(data);
    });

    eventSource.onerror = () => {
      debug.vue(
        "onerror fired, isLoading: %s, hasActiveRequest: %s",
        isLoading.value,
        hasActiveRequest.value,
      );
      if (!isLoading.value && !hasActiveRequest.value) {
        debug.vue("onerror ignored — stream already completed");
        eventSource = null;
        return;
      }
      console.error("EventSource error");
      error.value = "Stream connection error";
      isLoading.value = false;
      hasActiveRequest.value = false;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
    };
  }

  function disconnect() {
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  }

  return { connect, disconnect, state, isLoading, hasActiveRequest, error };
}
