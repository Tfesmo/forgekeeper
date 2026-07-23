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

const telemetryExpanded = ref(true);
const telemetryData = ref({});

const workflowLabels = {
  coding: "Coding",
  // review: "Review",
  // planning: "Planning",
  // advisory: "Advisory",
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
let telemetrySource = null;
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

  // Connect to permanent telemetry SSE
  telemetrySource = new EventSource('/api/stream');
  telemetrySource.addEventListener('progress', (e) => {
    const data = JSON.parse(e.data);
    telemetryData.value.progress = { ...data, server: data.server, timestamp: data.timestamp, fields: data.fields };
  });
  telemetrySource.addEventListener('draft_rate', (e) => {
    const data = JSON.parse(e.data);
    telemetryData.value.draft_rate = { ...data, server: data.server, timestamp: data.timestamp, fields: data.fields };
  });
  telemetrySource.onerror = () => {
    console.error('Telemetry EventSource error');
  };

  // Create a new session and load history
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
  if (telemetrySource) {
    telemetrySource.close();
    telemetrySource = null;
  }
  window.removeEventListener("keydown", handleKeyDown);
});

function handleKeyDown(e) {
  if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    cycleMode();
  }
}

const isLoading = ref(false);
const hasActiveRequest = ref(false);
const error = ref(undefined);
const tokensUsed = ref(0);
const tokensTotal = ref(64000);

function formatTokens(n) {
  if (n >= 1000000) {
    return (n / 1000000).toFixed(1) + "M";
  }
  if (n >= 1000) {
    return (n / 1000).toFixed(1) + "k";
  }
  return String(n);
}

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
    error.value = "Failed to create session";
    isLoading.value = false;
    hasActiveRequest.value = false;
    return;
  }

  // Step 1: POST the message to accept
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
    error.value = err.message;
    isLoading.value = false;
    hasActiveRequest.value = false;
    return;
  }

  // Step 2: Connect EventSource to GET stream
  eventSource = new EventSource(`/api/session/${sessionId}/stream`);
  let lastSeq = 0;

  eventSource.addEventListener("connected", (e) => {
    console.log("Connected to SSE stream");
  });

  eventSource.addEventListener("llm-chunk", (e) => {
    const data = JSON.parse(e.data);
    if (data.seq <= lastSeq) return;
    lastSeq = data.seq;
    appendChunk(data.content, "content");
  });

  eventSource.addEventListener("llm-reasoning", (e) => {
    const data = JSON.parse(e.data);
    if (data.seq <= lastSeq) return;
    lastSeq = data.seq;
    appendChunk(data.content, "reasoning");
  });

  eventSource.addEventListener("llm-done", (e) => {
    const data = JSON.parse(e.data);
    if (data.seq <= lastSeq) return;
    lastSeq = data.seq;
    if (data.message?.forgekeeper?.metrics?.usage?.total_tokens != null) {
      tokensUsed.value = data.message.forgekeeper.metrics.usage.total_tokens;
    }
    const lastMsg = messages.value[messages.value.length - 1];
    if (lastMsg && data.message?.forgekeeper) {
      lastMsg.forgekeeper = { ...lastMsg.forgekeeper, ...data.message.forgekeeper };
    }
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
  });

  eventSource.onerror = (e) => {
    console.error("EventSource error:", e);
    error.value = "Stream connection error";
    isLoading.value = false;
    hasActiveRequest.value = false;
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}

function appendChunk(content, type = "content") {
  const lastMsg = messages.value[messages.value.length - 1];

  if (lastMsg && lastMsg.role === "assistant" && lastMsg.forgekeeper?.mode === currentMode.value) {
    if (type === "reasoning") {
      lastMsg.reasoning_content = (lastMsg.reasoning_content || "") + content;
    } else {
      lastMsg.content = (lastMsg.content || "") + content;
    }
  } else {
    messages.value.push({
      role: "assistant",
      content: type === "reasoning" ? "" : content,
      reasoning_content: type === "reasoning" ? content : undefined,
      forgekeeper: { mode: currentMode.value },
    });
  }
}

async function sendMessage(text) {
  error.value = undefined;
  hasActiveRequest.value = true;
  isLoading.value = true;
  telemetryExpanded.value = true;

  // Add user message immediately
  messages.value.push({
    role: "user",
    content: text,
    forgekeeper: { mode: currentMode.value },
  });

  connectToStream(text);
}

async function abortRequest() {
  hasActiveRequest.value = false;
  isLoading.value = false;
  telemetryExpanded.value = true;
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
    error.value = "Failed to abort request";
  }
}
</script>

<template>
  <div class="chat-view">
    <div class="chat-header">
      <div class="header-left">
        <h1 class="app-title">Forgekeeper</h1>
        <div class="header-actions">
          <button
            class="theme-toggle"
            @click="toggleTheme"
            :title="themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            {{ themeMode === "dark" ? "☀" : "☾" }}
          </button>
          <a href="/theme-settings" target="_blank" class="theme-toggle" title="Theme settings">⚙</a>
        </div>
      </div>
      <div class="header-right">
        <div class="telemetry-wrapper">
          <div class="telemetry-badge" title="Progress: how far through the current operation | Draft acceptance rate: percentage of draft tokens accepted by the LLM">
            <span class="telemetry-compact" v-if="telemetryData.progress || telemetryData.draft_rate">
              <span :title="`Progress: ${(telemetryData.progress?.fields?.progress * 100).toFixed(1)}%`">
                {{ telemetryData.progress ? (telemetryData.progress.fields?.progress * 100).toFixed(0) + '%' : '—' }}
              </span>
              ·
              <span :title="`Draft acceptance: ${(telemetryData.draft_rate?.fields?.acceptance_rate * 100).toFixed(1)}%`">
                {{ telemetryData.draft_rate ? (telemetryData.draft_rate.fields?.acceptance_rate * 100).toFixed(1) + '%' : '—' }}
              </span>
            </span>
            <span class="telemetry-compact" v-else>—</span>
          </div>
        </div>
        <div class="token-counter">
          <span class="token-values"
            >[ {{ formatTokens(tokensUsed) }} / {{ formatTokens(tokensTotal) }} ]</span
          >
          <span class="token-percent">{{ ((tokensUsed / tokensTotal) * 100).toFixed(2) }}%</span>
        </div>
      </div>
    </div>
    <MessageHistory
      :messages="messages"
      :current-mode="currentMode"
      :is-streaming="hasActiveRequest"
    />
    <div v-if="error" class="error-message">{{ error }}</div>
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
        :is-loading="isLoading"
        :has-active-request="hasActiveRequest"
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

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 4px;
  transition:
    color 0.3s,
    background 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.theme-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.app-title {
  font-size: 1.5em;
  color: var(--text-secondary);
}

.token-counter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-values {
  color: var(--text-muted);
  font-family: monospace;
}

.token-percent {
  color: var(--accent-focus);
  font-weight: bold;
  font-family: monospace;
}

.telemetry-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
}

.telemetry-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  font-family: monospace;
  font-size: 0.85em;
  white-space: nowrap;
  user-select: none;
}

.telemetry-badge:hover {
  background: var(--bg-tertiary);
}

.telemetry-compact {
  color: var(--text-muted);
}

.telemetry-arrow {
  color: var(--text-dim);
  font-size: 0.7em;
  opacity: 0.5;
}

.telemetry-metric {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.metric-label {
  color: var(--text-dim);
  font-size: 0.75em;
}

.metric-value {
  color: var(--text-primary);
  font-weight: bold;
}

.metric-detail {
  color: var(--text-dim);
  font-size: 0.7em;
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
