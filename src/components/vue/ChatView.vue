<script setup>
import { ref, onMounted, computed } from "vue";
import MessageHistory from "./MessageHistory.vue";
import UserPrompt from "./UserPrompt.vue";
import { getRoleLabel, getRoleSymbol } from "./chatHelpers.js";

const messages = ref([]);
const currentRole = ref("analyst");
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

  messages.value = [...messages.value, { role: "user", text }];
  isLoading.value = true;

  try {
    await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: messages.value,
        role: currentRole.value,
      }),
    });
  } catch (err) {
    error.value = err.message;
  }
}

onMounted(() => {
  setInterval(handlePolling, 2000);
});
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
      :current-role="currentRole"
    />
    <div v-if="error" class="error-message">{{ error }}</div>
    <UserPrompt @submit="sendMessage" />
  </div>
</template>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: #1a1a2e;
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
</style>
