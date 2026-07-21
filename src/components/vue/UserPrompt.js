import { defineComponent, ref } from "vue";

export default defineComponent({
  name: "UserPrompt",
  emits: ["submit"],
  setup(_, { emit }) {
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

    return {
      promptText,
      handleSubmit,
      handleKeydown,
    };
  },
  template: `
    <div class="user-prompt">
      <form class="prompt-form" @submit.prevent="handleSubmit">
        <input
          v-model="promptText"
          type="text"
          class="prompt-input"
          placeholder="Enter your message..."
          @keydown="handleKeydown"
        />
        <button
          type="submit"
          class="submit-button"
          :disabled="!promptText.trim()"
        >
          Send
        </button>
      </form>
    </div>
  `,
});
