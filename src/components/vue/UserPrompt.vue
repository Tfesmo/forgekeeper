<script setup>
import { ref } from "vue";

const props = defineProps({
  isLoading: { type: Boolean, default: false },
  hasActiveRequest: { type: Boolean, default: false },
});

const emit = defineEmits(["submit", "abort"]);

const promptText = ref("");

function handleSubmit() {
  if (promptText.value.trim() && !props.isLoading) {
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
      <div class="button-column">
        <button
          type="button"
          class="abort-button"
          :disabled="!props.hasActiveRequest"
          @click="emit('abort')"
        >
          Cancel
        </button>
        <button
          type="submit"
          class="submit-button"
          :disabled="!promptText.trim() || props.isLoading"
        >
          Send
        </button>
      </div>
    </form>
  </div>
</template>

<style scoped>
.user-prompt {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.prompt-form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  flex: 1;
}

.button-column {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.prompt-input {
  min-width: 0;
  padding: 12px 16px;
  border: 1px solid var(--bg-tertiary);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-size: 1em;
  font-family: inherit;
  outline: none;
  resize: none;
  min-height: 48px;
  max-height: 200px;
  overflow-y: auto;
  transition: border-color 0.2s;
  line-height: 1.5;
  flex: 1;
}

.prompt-input:focus {
  border-color: var(--accent-focus);
}

.prompt-input::placeholder {
  color: var(--text-veryDim);
}

.submit-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--button-submit);
  color: var(--text-white);
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  width: 100%;
}

.submit-button:hover:not(:disabled) {
  background: var(--button-submitHover);
}

.submit-button:disabled {
  background: var(--button-submitDisabled);
  color: var(--button-submitDisabledText);
  cursor: not-allowed;
}

.abort-button {
  padding: 12px 24px;
  border: none;
  border-radius: 8px;
  background: var(--button-abort);
  color: var(--text-white);
  font-size: 1em;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  white-space: nowrap;
  width: 100%;
}

.abort-button:hover:not(:disabled) {
  background: var(--button-abortHover);
}

.abort-button:disabled {
  background: var(--button-abortDisabled);
  color: var(--button-abortDisabledText);
  cursor: not-allowed;
}
</style>
