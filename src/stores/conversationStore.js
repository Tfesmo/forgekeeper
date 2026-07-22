/**
 * Conversation state store.
 *
 * Single conversation in memory. When multi-session support lands,
 * this will be swapped for a Map + JSON file persistence layer.
 *
 * Data flows: conversation state -> messages array (see docs/messages-contract.md)
 * -> Jinja prompt templates (see docs/jinja-prompt-templates.md) -> LLM API.
 *
 * Guarded files (see messages-contract.md):
 * - src/stores/conversationStore.js
 * - src/services/llmService.js
 * - src/routes/chatRoutes.js
 */

let conversation = null;

export function getConversation(_sessionId) {
  return conversation;
}

export function setConversation(_sessionId, data) {
  conversation = data;
  return conversation;
}

/**
 * Test-only utility. Resets conversation to allow repeated test runs.
 */
export function clearConversation(_sessionId) {
  conversation = null;
}
