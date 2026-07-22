const conversations = new Map();

/**
 * Conversation state store.
 *
 * Data flows: conversation state -> messages array (see docs/messages-contract.md)
 * -> Jinja prompt templates (see docs/jinja-prompt-templates.md) -> LLM API.
 *
 * Guarded files (see messages-contract.md):
 * - src/stores/conversationStore.js
 * - src/services/llmService.js
 * - src/routes/chatRoutes.js
 */

export function getConversation(sessionId) {
  return conversations.get(sessionId);
}

export function setConversation(sessionId, data) {
  conversations.set(sessionId, data);
  return conversations.get(sessionId);
}

export function clearConversation(sessionId) {
  conversations.delete(sessionId);
}

export function getAllConversations() {
  return new Map(conversations);
}
