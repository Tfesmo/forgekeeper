<script setup>
import { computed, ref, nextTick, watch } from "vue";

import { getMessageLabel, getMessageDisplayMode } from "./chatHelpers.js";

const props = defineProps({
  messages: { type: Array, required: true },
  currentMode: { type: String, default: "analyst" },
});

const messageHistoryRef = ref(null);

const filteredMessages = computed(() => props.messages.filter((msg) => msg.role !== "system"));

function scrollToBottom() {
  const container = messageHistoryRef.value;
  if (!container) return;
  const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
  if (isNearBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

watch(
  () => props.messages,
  () => {
    nextTick(() => {
      requestAnimationFrame(scrollToBottom);
    });
  },
);

const modeColorHex = {
  yellow: "#e0e040",
  cyan: "#40e0e0",
  green: "#40c040",
  magenta: "#c040e0",
  blue: "#4080e0",
};

function getMessageLabelData(msg) {
  const displayMode = getMessageDisplayMode(msg, props.currentMode);
  return getMessageLabel(msg.role, displayMode);
}

function getModeBorderColor(msg) {
  const label = getMessageLabelData(msg);
  return modeColorHex[label.color] || "transparent";
}
</script>

<template>
  <div class="message-history" ref="messageHistoryRef">
    <div
      v-for="(msg, index) in filteredMessages"
      :key="index"
      class="message-item"
      :style="
        msg.role === 'user'
          ? {}
          : { borderLeft: `3px solid ${getModeBorderColor(msg)}`, paddingLeft: '15px' }
      "
    >
      <div class="message-header" :style="{ color: getMessageLabelData(msg).color }">
        <span class="message-symbol">{{ getMessageLabelData(msg).symbol }}</span>
        <span class="message-label">{{ getMessageLabelData(msg).label }}:</span>
        <span
          v-if="msg.forgekeeper?.metrics?.usage"
          class="usage-badge"
          :title="JSON.stringify(msg.forgekeeper.metrics, null, 2)"
        >
          [T]
        </span>
      </div>
      <div class="message-content">{{ msg.content }}</div>
      <div v-if="msg.reasoning_content" class="reasoning-content">
        <details>
          <summary>Reasoning</summary>
          <div>{{ msg.reasoning_content }}</div>
        </details>
      </div>
    </div>
    <div v-if="filteredMessages.length === 0" class="empty-state">
      <p>Forgekeeper ready.</p>
      <p class="dim">Type a message to begin.</p>
    </div>
  </div>
</template>

<style scoped>
.message-history {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-anchor: none;
  padding: 16px 24px;
  background: #0f0f1a;
}

.message-item {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
}

.message-header {
  font-size: 0.85em;
  font-weight: bold;
  margin-bottom: 6px;
  text-transform: uppercase;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.usage-badge {
  font-size: 0.7em;
  font-family: monospace;
  color: #7eb8da;
  opacity: 0.6;
  cursor: help;
  padding: 1px 4px;
  border: 1px solid rgba(126, 184, 218, 0.2);
  border-radius: 3px;
}

.usage-badge:hover {
  opacity: 1;
}

.reasoning-content {
  margin-top: 8px;
}

.reasoning-content details {
  font-size: 0.85em;
  color: #808090;
  cursor: pointer;
}

.reasoning-content details[open] summary {
  margin-bottom: 4px;
}

.reasoning-content details > div {
  padding: 8px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 4px;
  white-space: pre-wrap;
  font-size: 0.85em;
  line-height: 1.5;
}

.message-symbol {
  margin-right: 6px;
}

.message-label {
  margin-right: 4px;
}

.message-content {
  line-height: 1.6;
  color: #f0f0f5;
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #c0c0d0;
  text-align: center;
}

.empty-state p {
  margin: 4px 0;
}

.dim {
  opacity: 0.6;
  font-size: 0.9em;
}
</style>
