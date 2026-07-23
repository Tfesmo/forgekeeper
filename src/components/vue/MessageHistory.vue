<script setup>
import { computed, ref, nextTick, watch } from "vue";

import { getMessageLabel, getMessageDisplayMode, formatMs, showThinkingIndicator, showThoughtIndicator } from "./chatHelpers.js";

const props = defineProps({
  messages: { type: Array, required: true },
  currentMode: { type: String, default: "analyst" },
  isStreaming: { type: Boolean, default: false },
});

const messageHistoryRef = ref(null);
const elapsedMs = ref(0);
const frozenElapsedMs = ref(0);
let timerInterval = null;
let hasFrozen = false;

watch(
  () => props.isStreaming,
  (streaming) => {
    if (streaming) {
      elapsedMs.value = 0;
      frozenElapsedMs.value = 0;
      hasFrozen = false;
      timerInterval = setInterval(() => {
        elapsedMs.value += 10;
      }, 10);
    } else {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
      }
    }
  },
);

watch(
  () => props.messages,
  () => {
    if (!props.isStreaming || hasFrozen) return;
    const assistantMsg = props.messages.filter(m => m.role === "assistant").pop();
    if (assistantMsg && assistantMsg.reasoning_content && assistantMsg.content) {
      frozenElapsedMs.value = elapsedMs.value;
      hasFrozen = true;
    }
  },
  { deep: true }
);

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

function getMessageLabelData(msg) {
  const displayMode = getMessageDisplayMode(msg, props.currentMode);
  return getMessageLabel(msg.role, displayMode);
}

function getModeBorderColor(msg) {
  const label = getMessageLabelData(msg);
  return label.color || "transparent";
}

function showThinking(msg) {
  return showThinkingIndicator(msg, props.isStreaming);
}

function showThought(msg) {
  return showThoughtIndicator(msg, props.isStreaming);
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
        <div class="message-label-group">
          <span class="message-symbol">{{ getMessageLabelData(msg).symbol }}</span>
          <span class="message-label">{{ getMessageLabelData(msg).label }}:</span>
          <span
            v-if="showThinking(msg)"
            class="thinking-inline"
          >
            Thinking... <span class="thinking-timer">{{ formatMs(elapsedMs) }}</span>
          </span>
          <span
            v-if="showThought(msg)"
            class="thought-inline"
          >
            Thought: <span class="thought-timer">{{ formatMs(frozenElapsedMs) }}</span>
          </span>
        </div>
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
  background: var(--bg-primary);
}

.message-item {
  margin-bottom: 20px;
  padding: 12px 16px;
  background: var(--surfaces-messageItem);
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

.message-label-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.usage-badge {
  font-size: 0.7em;
  font-family: monospace;
  color: var(--surfaces-usageBadge);
  opacity: 0.6;
  cursor: help;
  padding: 1px 4px;
  border: 1px solid var(--surfaces-usageBadgeBorder);
  border-radius: 3px;
}

.usage-badge:hover {
  opacity: 1;
}

.thinking-inline {
  font-size: 0.75em;
  color: var(--text-dim);
  margin-left: 8px;
}

.thinking-timer {
  font-family: monospace;
  color: #FBBF24;
  font-size: 0.9em;
}

.thought-inline {
  font-size: 0.75em;
  color: var(--text-dim);
  margin-left: 8px;
}

.thought-timer {
  font-family: monospace;
  color: #FBBF24;
  font-size: 0.9em;
}

.reasoning-content {
  margin-top: 8px;
}

.reasoning-content details {
  font-size: 0.85em;
  color: var(--text-dim);
  cursor: pointer;
}

.reasoning-content details[open] summary {
  margin-bottom: 4px;
}

.reasoning-content details > div {
  padding: 8px;
  background: var(--surfaces-reasoningContent);
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
  color: var(--text-primary);
  white-space: pre-wrap;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: var(--surfaces-emptyState);
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
