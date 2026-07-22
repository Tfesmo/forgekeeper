const conversations = new Map();

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
