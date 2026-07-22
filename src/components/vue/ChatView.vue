<script setup>
import { ref, onMounted, computed } from "vue";
import MessageHistory from "./MessageHistory.vue";
import UserPrompt from "./UserPrompt.vue";
import { getModeLabel, getModeSymbol, MODE_CONFIG, WORKFLOW_MODES, DEFAULT_WORKFLOW } from "./chatHelpers.js";

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
    advisor: "#e0e040",
    architect: "#40e0e0",
    implementer: "#40c040",
    reviewer: "#c040e0",
    analyst: "#4080e0",
  };
  return colors[currentMode.value] || "#e0e0e0";
});

const modeSymbol = computed(() => getModeSymbol(currentMode.value, currentMode.value));
const modeLabel = computed(() => getModeLabel(currentMode.value, currentMode.value));

function cycleMode() {
  if (!availableModes.value.length) return;
  const idx = availableModes.value.findIndex((r) => r.id === currentMode.value);
  const nextIdx = (idx + 1) % availableModes.value.length;
  currentMode.value = availableModes.value[nextIdx].id;
}

onMounted(async () => {
  try {
    const res = await fetch("/api/server/options");
    const data = await res.json();
    availableModes.value = data.modes;
    currentMode.value = data.currentMode;
  } catch {
    const workflowModes = WORKFLOW_MODES[DEFAULT_WORKFLOW] || Object.keys(MODE_CONFIG);
    availableModes.value = workflowModes.map((id) => ({ id, label: MODE_CONFIG[id].label, symbol: MODE_CONFIG[id].symbol }));
  }

  setInterval(handlePolling, 2000);

  window.addEventListener("keydown", handleKeyDown);
});

function handleKeyDown(e) {
  if (e.key === "Tab" && e.shiftKey) {
    e.preventDefault();
    cycleMode();
  }
}

const isLoading = ref(false);
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
    if (data.tokensUsed !== undefined) {
      tokensUsed.value = data.tokensUsed;
    }
    if (data.tokensTotal !== undefined) {
      tokensTotal.value = data.tokensTotal;
    }
  } catch {
    isLoading.value = false;
  }
}

async function sendMessage(text) {
  error.value = undefined;
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

</script>

<template>
  <div class="chat-view">
    <div class="chat-header">
      <h1 class="app-title">Forgekeeper</h1>
      <div class="token-counter">
        <span class="token-values">[ {{ formatTokens(tokensUsed) }} / {{ formatTokens(tokensTotal) }} ]</span>
        <span class="token-percent">{{ (tokensUsed / tokensTotal * 100).toFixed(2) }}%</span>
      </div>
    </div>
    <MessageHistory
      :messages="messages"
      :current-mode="currentMode"
    />
    <div v-if="error" class="error-message">{{ error }}</div>
    <div class="status-bar">
      <span class="workflow-badge">{{ workflowLabel }}</span>
      <button class="mode-switch" :style="{ color: modeColor }" @click="cycleMode" title="Shift+Tab to cycle modes">
        <span class="mode-icon">{{ modeSymbol }}</span>
        <span class="mode-text">{{ modeLabel }}</span>
        <span class="switch-arrows" title="Shift+Tab to cycle modes">&#8646;&#8647;</span>
      </button>
    </div>
    <UserPrompt @submit="sendMessage" />
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
  background: #1a1a2e;
  position: sticky;
  top: 0;
  z-index: 10;
}

.app-title {
  font-size: 1.5em;
  color: #e0e0e0;
}

.token-counter {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9em;
}

.token-values {
  color: #a0a0b0;
  font-family: monospace;
}

.token-percent {
  color: #7eb8da;
  font-weight: bold;
  font-family: monospace;
}

.error-message {
  padding: 12px 24px;
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
}

.status-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 24px;
  background: #1a1a2e;
  border-top: 1px solid #2d2d4e;
  font-size: 0.8em;
}

.workflow-badge {
  color: #808090;
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
  color: #4080e0;
  transition: color 0.3s, opacity 0.2s;
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
</style>
