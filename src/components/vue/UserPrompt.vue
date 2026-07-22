<script setup>
import { ref } from "vue";

const emit = defineEmits(["submit"]);

const promptText = ref("");

function handleSubmit() {
  if (promptText.value.trim()) {
    emit("submit", promptText.value.trim());
    promptText.value = "";
  }
}

function handleKeydown(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
}
</script>

<template>
  <div class="user-prompt">
    <form class="prompt-form" @submit.prevent="handleSubmit">
      <textarea
        v-model="promptText"
        class="prompt-input"
        placeholder="Enter your message..."
        rows="1"
        @keydown="handleKeydown"
      ></textarea>
      <button
        type="submit"
        class="submit-button"
        :disabled="!promptText.trim()"
      >
        Send
      </button>
    </form>
  </div>
</template>

<style scoped>
.user-prompt {
  padding: 16px 24px;
  background: #1a1a2e;
  margin-top: auto;
}

.prompt-form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.prompt-input {
  flex: 1;
  padding: 12px 16px;
  border: 1px solid #2d2d4e;
  border-radius: 8px;
  background: #0f0f1a;
  color: #e0e0e0;
  font-size: 1em;
  font-family: inherit;
  outline: none;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  overflow-y: auto;
  transition: border-color 0.2s;
  line-height: 1.5;
}

.prompt-input:focus {
  border-color: #7eb8da;
}

.prompt-input::placeholder {
  color: #606080;
}

.submit-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: #4a9eff;
  color: #ffffff;
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
}

.submit-button:hover:not(:disabled) {
  background: #3a8eef;
}

.submit-button:disabled {
  background: #2d2d4e;
  color: #606080;
  cursor: not-allowed;
}
</style>
