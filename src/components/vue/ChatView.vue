<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

import { getThemeMode, setThemeMode } from "../../themes/manager.js";
import {
  getModeLabel,
  getModeSymbol,
  MODE_CONFIG,
  WORKFLOW_MODES,
  DEFAULT_WORKFLOW,
} from "./chatHelpers.js";
import MessageHistory from "./MessageHistory.vue";
import UserPrompt from "./UserPrompt.vue";
import { useSseStream } from "./useSseStream.js";

const emit = defineEmits(["tokens-updated"]);

const workflowLabels = {
  coding: "Coding",
};

const messages = ref([]);
const currentMode = ref("analyst");
const availableModes = ref([]);

const workflowLabel = computed(() => workflowLabels[DEFAULT_WORKFLOW] || DEFAULT_WORKFLOW);

const themeMode = ref(getThemeMode());

function toggleTheme() {
  const newMode = themeMode.value === "dark" ? "light" : "dark";
  setThemeMode(newMode);
  themeMode.value = newMode;
}

const modeColor = computed(() => {
  const colors = {
    advisor: "var(--mode-advisor)",
    architect: "var(--mode-architect)",
    implementer: "var(--mode-implementer)",
    reviewer: "var(--mode-reviewer)",
    analyst: "var(--mode-analyst)",
  };
  return colors[currentMode.value] || "var(--text-secondary)";
});

const modeSymbol = computed(() => getModeSymbol(currentMode.value, currentMode.value));
const modeLabel = computed(() => getModeLabel(currentMode.value, currentMode.value));

function cycleMode() {
  if (!availableModes.value.length) return;
  const idx = availableModes.value.findIndex((r) => r.id === currentMode.value);
  const nextIdx = (idx + 1) % availableModes.value.length;
  currentMode.value = availableModes.value[nextIdx].id;
}

let eventSource = null;
let sessionId = null;
let streamingController = null;

onMounted(async () => {
  try {
    const res = await fetch("/api/server/options");
    const data = await res.json();
    availableModes.value = data.modes;
    currentMode.value = data.currentMode;
  } catch {
    const workflowModes = WORKFLOW_MODES[DEFAULT_WORKFLOW] || Object.keys(MODE_CONFIG);
    availableModes.value = workflowModes.map((id) => ({
      id,
      label: MODE_CONFIG[id].label,
      symbol: MODE_CONFIG[id].symbol,
    }));
  }

  window.addEventListener("keydown", handleKeyDown);

  await createSession();
  if (sessionId) {
    try {
      const res = await fetch(`/api/session/${sessionId}/status`);
      const data = await res.json();
      if (data.messages) {
        messages.value = data.messages;
      }
    } catch {
      console.error("Failed to load session history");
    }
  }
});

onBeforeUnmount(() => {
  if (streamingController) {
    streamingController.abort();
    streamingController = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
  window.removeEventListener("keydown", handleKeyDown);
  disconnect();
});

function handleKeyDown(e) {
  if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    cycleMode();
  }
}

const tokensUsed = ref(0);
const tokensTotal = ref(64000);

const { connect: connectSse, disconnect, isLoading: sseLoading, hasActiveRequest: sseActiveRequest, error: sseError } = useSseStream();

async function createSession() {
  try {
    const res = await fetch("/api/session/new");
    const data = await res.json();
    if (data.id) {
      sessionId = data.id;
    }
  } catch (err) {
    console.error("Failed to create session:", err);
  }
}

async function connectToStream(messageText) {
  if (!sessionId) {
    await createSession();
  }

  if (!sessionId) {
    sseError.value = "Failed to create session";
    sseLoading.value = false;
    sseActiveRequest.value = false;
    return;
  }

  try {
    const response = await fetch(`/api/session/${sessionId}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: messageText,
        mode: currentMode.value,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    if (!data.accepted) {
      throw new Error("Stream request was not accepted");
    }
  } catch (err) {
    sseError.value = err.message;
    sseLoading.value = false;
    sseActiveRequest.value = false;
    return;
  }

  connectSse(sessionId, currentMode.value, (data) => {
    if (data.message?.forgekeeper?.metrics?.usage?.total_tokens != null) {
      tokensUsed.value = data.message.forgekeeper.metrics.usage.total_tokens;
      emit("tokens-updated", { used: tokensUsed.value, total: tokensTotal.value });
    }
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && data.message?.forgekeeper) {
      lastMsg.forgekeeper = { ...lastMsg.forgekeeper, ...data.message.forgekeeper };
    }
  }, messages);
}

async function sendMessage(text) {
  sseError.value = undefined;
  sseActiveRequest.value = true;
  sseLoading.value = true;

  messages.value.push({
    role: "user",
    content: text,
    forgekeeper: { mode: currentMode.value },
  });

  connectToStream(text);
}

async function abortRequest() {
  sseActiveRequest.value = false;
  sseLoading.value = false;
  if (streamingController) {
    streamingController.abort();
    streamingController = null;
  }
  try {
    await fetch(`/api/session/${sessionId}/abort`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
  } catch {
    sseError.value = "Failed to abort request";
  }
}
</script>

<template>
  <div class="chat-view">
    <MessageHistory
      :messages="messages"
      :current-mode="currentMode"
      :is-streaming="sseActiveRequest"
    />
    <div v-if="sseError" class="error-message">{{ sseError }}</div>
    <div class="status-bar">
      <span class="workflow-badge">{{ workflowLabel }}</span>
      <button
        class="mode-switch"
        :style="{ color: modeColor }"
        @click="cycleMode"
        title="Shift+Tab to cycle modes"
      >
        <span class="mode-icon">{{ modeSymbol }}</span>
        <span class="mode-text">{{ modeLabel }}</span>
        <span class="switch-arrows" title="Shift+Tab to cycle modes">&#8646;&#8647;</span>
      </button>
    </div>
    <div class="prompt-area">
      <UserPrompt
        @submit="sendMessage"
        :is-loading="sseLoading"
        :has-active-request="sseActiveRequest"
        @abort="abortRequest"
      />
    </div>
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.error-message {
  padding: 12px 24px;
  color: var(--status-error);
  background: var(--status-error-bg);
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--bg-tertiary);
}

.workflow-badge {
  color: var(--text-dim);
  font-weight: 500;
  font-size: 1em;
}

.mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 1em;
  color: var(--accent-blue);
  transition:
    color 0.3s,
    opacity 0.2s;
  padding: 2px 4px;
  border-radius: 4px;
}

.mode-switch:hover {
  opacity: 0.75;
}

.mode-switch:active {
  opacity: 0.6;
}

.mode-icon {
  font-size: 1em;
}

.mode-text {
  transition: color 0.3s;
}

.switch-arrows {
  font-size: 0.7em;
  opacity: 0.5;
  letter-spacing: -1px;
}

.role-switch:hover .switch-arrows {
  opacity: 0.7;
}

.prompt-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  margin-top: auto;
}
</style>
