import { defineComponent, ref, onMounted } from "vue";

import MessageHistory from "./MessageHistory.js";
import UserPrompt from "./UserPrompt.js";

export default defineComponent({
  name: "ChatView",
  components: {
    MessageHistory,
    UserPrompt,
  },
  setup() {
    const messages = ref([]);
    const currentRole = ref("implementer");
    const isLoading = ref(false);
    const error = ref(null);

    async function sendMessage(text) {
      error.value = null;

      const userMessage = { role: "user", text };
      messages.value = [...messages.value, userMessage];
      isLoading.value = true;

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: messages.value,
            role: currentRole.value,
          }),
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`API error: ${response.status} - ${errorBody}`);
        }

        const data = await response.json();
        const assistantMessage = {
          role: "assistant",
          text: data.content || "[No response]",
        };
        messages.value = [...messages.value, assistantMessage];
      } catch (err) {
        error.value = err.message;
      } finally {
        isLoading.value = false;
      }
    }

    function handlePolling() {
      if (isLoading.value) {
        fetch("/api/chat-status")
          .then((res) => res.json())
          .then((data) => {
            if (data.messages && data.messages.length > 0) {
              messages.value = data.messages;
            }
            if (data.error) {
              error.value = data.error;
            }
          })
          .catch(() => {})
          .finally(() => {
            if (data.done) {
              isLoading.value = false;
            }
          });
      }
    }

    onMounted(() => {
      setInterval(handlePolling, 20000);
    });

    return {
      messages,
      currentRole,
      isLoading,
      error,
      sendMessage,
    };
  },
  template: `
    <div class="chat-view">
      <div class="chat-header">
        <h1 class="app-title">Forgekeeper</h1>
      </div>
      <MessageHistory
        :messages="messages"
        :current-role="currentRole"
      />
      <div v-if="error" class="error-message">{{ error }}</div>
      <UserPrompt @submit="sendMessage" />
    </div>
  `,
});
