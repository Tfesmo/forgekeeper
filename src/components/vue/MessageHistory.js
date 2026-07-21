import { defineComponent, computed } from "vue";

import { getMessageLabel } from "./chatHelpers.js";

export default defineComponent({
  name: "MessageHistory",
  props: {
    messages: {
      type: Array,
      required: true,
    },
    currentRole: {
      type: String,
      default: "implementer",
    },
  },
  setup(props) {
    const filteredMessages = computed(() => props.messages.filter((msg) => msg.role !== "system"));

    function getMessageLabelData(msg) {
      return getMessageLabel(msg.role, props.currentRole);
    }

    return {
      filteredMessages,
      getMessageLabelData,
    };
  },
  template: `
    <div class="message-history">
      <div
        v-for="(msg, index) in filteredMessages"
        :key="index"
        class="message-item"
      >
        <div class="message-header" :style="{ color: getMessageLabelData(msg).color }">
          <span class="message-symbol">{{ getMessageLabelData(msg).symbol }}</span>
          <span class="message-label">{{ getMessageLabelData(msg).label }}:</span>
        </div>
        <div class="message-content">{{ msg.text }}</div>
      </div>
      <div v-if="filteredMessages.length === 0" class="empty-state">
        <p>Forgekeeper ready.</p>
        <p class="dim">Type a message to begin.</p>
      </div>
    </div>
  `,
});
