<script setup>
import { ref, onMounted, onBeforeUnmount, computed } from "vue";

import {
  getModeLabel,
  getModeSymbol,
  MODE_CONFIG,
  WORKFLOW_MODES,
  DEFAULT_WORKFLOW,
} from "./chatHelpers.js";
import MessageHistory from "./MessageHistory.vue";
import UserPrompt from "./UserPrompt.vue";

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

let pollIntervalId = null;

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

  pollIntervalId = setInterval(handlePolling, 2000);

  window.addEventListener("keydown", handleKeyDown);
});

onBeforeUnmount(() => {
  if (pollIntervalId) {
    clearInterval(pollIntervalId);
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

async function handlePolling() {
  try {
    const res = await fetch("/api/chat/status");
    const data = await res.json();
    if (data.messages && data.messages.length > 0) {
      messages.value = data.messages;
    }
    if (data.error) {
      error.value = data.error;
    }
    if (data.done) {
      isLoading.value = false;
    }
    if (data.aborted !== undefined) {
      hasActiveRequest.value = data.aborted;
    }
    if (data.tokensUsed !== undefined) {
      tokensUsed.value = data.tokensUsed;
    }
    if (data.tokensTotal !== undefined) {
      tokensTotal.value = data.tokensTotal;
    }
  } catch {
    isLoading.value = false;
    hasActiveRequest.value = false;
  }
}

async function sendMessage(text) {
  error.value = undefined;
  hasActiveRequest.value = false;
  isLoading.value = true;

  try {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        mode: currentMode.value,
      }),
    });
  } catch (err) {
    error.value = err.message;
  }
}

async function abortRequest() {
  hasActiveRequest.value = false;
  try {
    await fetch("/api/chat/abort", { method: "POST" });
  } catch {
    error.value = "Failed to abort request";
  }
}
</script>

<template>
  <div class="chat-view">
    <div class="chat-header">
      <h1 class="app-title">Forgekeeper</h1>
      <div class="token-counter">
        <span class="token-values"
          >[ {{ formatTokens(tokensUsed) }} / {{ formatTokens(tokensTotal) }} ]</span
        >
        <span class="token-percent">{{ ((tokensUsed / tokensTotal) * 100).toFixed(2) }}%</span>
      </div>
    </div>
    <MessageHistory :messages="messages" :current-mode="currentMode" />
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

.app-title {
  font-size: 1.5em;
  color: var(--text-secondary);
}

.token-counter {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
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
  font-size: 0.8em;
}

.workflow-badge {
  color: var(--text-dim);
  font-weight: 500;
}

.mode-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8em;
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
  font-size: 0.9em;
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
