<script setup>
import { computed } from "vue";
import { getMessageLabel } from "./chatHelpers.js";

const props = defineProps({
  messages: { type: Array, required: true },
  currentRole: { type: String, default: "analyst" },
});

const filteredMessages = computed(
  () => props.messages.filter((msg) => msg.role !== "system")
);

function getMessageLabelData(role) {
  return getMessageLabel(role, props.currentRole);
}
</script>

<template>
  <div class="message-history">
    <div
      v-for="(msg, index) in filteredMessages"
      :key="index"
      class="message-item"
    >
      <div class="message-header" :style="{ color: getMessageLabelData(msg.role).color }">
        <span class="message-symbol">{{ getMessageLabelData(msg.role).symbol }}</span>
        <span class="message-label">{{ getMessageLabelData(msg.role).label }}:</span>
      </div>
      <div class="message-content">{{ msg.content }}</div>
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
