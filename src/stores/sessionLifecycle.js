import { v4 as uuidv4 } from "uuid";

import { TOKEN_LIMIT } from "../config/tokens.js";
import { buildSystemMessage } from "../services/llmService.js";
import { estimateTokensForMessages } from "../utils/tokenizer.js";
import { abortControllers } from "./abortControllers.js";
import { sessionCache, evictOldest, cacheSet, cacheDelete } from "./sessionCache.js";
import {
  SESSION_DIR,
  readSessionFile,
  writeSessionFileAtomic,
  listSessionFiles,
  deleteSessionFile,
} from "./sessionFileOps.js";
import { withLock } from "./sessionLock.js";

export function createSession(mode, overrides = {}) {
  const id = overrides.id || uuidv4();
  const session = {
    id,
    messages: overrides.messages || [{ role: "system", content: buildSystemMessage(mode) }],
    mode: overrides.mode || mode || "analyst",
    done: overrides.done ?? false,
    error: overrides.error,
    abortController: overrides.abortController ?? null,
    created: overrides.created || Date.now(),
    updated: overrides.updated || Date.now(),
  };
  cacheSet(id, session);
  writeSessionFileAtomic(id, session);
  return { id, session };
}

export function getSession(sessionId) {
  try {
    const data = readSessionFile(sessionId);
    cacheSet(sessionId, data);
    return data;
  } catch {
    cacheDelete(sessionId);
    return null;
  }
}

export function deleteSession(sessionId) {
  cacheDelete(sessionId);
  deleteSessionFile(sessionId);
}

export function updateSession(sessionId, data) {
  const session = { ...data, updated: Date.now() };
  if (Array.isArray(session.messages)) {
    session.messages = session.messages.map((msg) => structuredClone(msg));
  }
  cacheSet(sessionId, session);
  writeSessionFileAtomic(sessionId, session);
  return session;
}

export function finalizeSession(sessionId) {
  return withLock(sessionId, async () => {
    const session = getSession(sessionId);
    const controller = abortControllers.get(sessionId);
    if (!session || !controller) {
      return { aborted: false, error: "No active request to abort" };
    }
    controller.abort();
    abortControllers.delete(sessionId);
    session.done = true;
    updateSession(sessionId, session);
    return { aborted: true };
  });
}

export function resolveSessionForStream(sessionId, mode, message) {
  return withLock(sessionId, async () => {
    let session = getSession(sessionId);

    if (!session) {
      session = createSession(mode, {
        id: sessionId,
        messages: [{ role: "system", content: buildSystemMessage(mode) }],
        mode,
        done: false,
        abortController: null,
      });
    }

    if (abortControllers.has(sessionId)) {
      const existingController = abortControllers.get(sessionId);
      if (existingController && !existingController.signal.aborted) {
        return { session: null, error: "Already processing a request for this session" };
      }
    }

    session.messages = session.messages || [];
    session.messages.push({ role: "user", content: message, forgekeeper: { mode } });
    session.mode = mode;
    session.done = false;
    session.error = undefined;

    updateSession(sessionId, session);
    abortControllers.set(sessionId, new AbortController());
    return { session, error: null };
  });
}

export function finalizeSessionOnSuccess(sessionId, assistantMessage) {
  return withLock(sessionId, async () => {
    const session = getSession(sessionId);
    if (!session) return;
    session.messages.push(assistantMessage);

    if (!assistantMessage.forgekeeper?.metrics?.usage?.total_tokens) {
      const estimatedTokens = estimateTokensForMessages(session.messages);
      assistantMessage.forgekeeper = assistantMessage.forgekeeper || {};
      assistantMessage.forgekeeper.metrics = assistantMessage.forgekeeper.metrics || {};
      assistantMessage.forgekeeper.metrics.usage = assistantMessage.forgekeeper.metrics.usage || {};
      assistantMessage.forgekeeper.metrics.usage.total_tokens = estimatedTokens;
    }

    session.done = true;
    session.error = undefined;
    abortControllers.delete(sessionId);
    updateSession(sessionId, session);
  });
}

export function finalizeSessionOnError(sessionId, errorMessage) {
  return withLock(sessionId, async () => {
    const session = getSession(sessionId);
    if (!session) return;
    session.error = errorMessage;
    session.done = true;
    abortControllers.delete(sessionId);
    updateSession(sessionId, session);
  });
}

export function getActiveSessionId() {
  for (const id of abortControllers.keys()) {
    const controller = abortControllers.get(id);
    if (controller && !controller.signal.aborted) return id;
  }
  return null;
}

export function listSessions() {
  try {
    const files = listSessionFiles();
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const data = readSessionFile(f.replace(".json", ""));
        return {
          id: data.id,
          mode: data.mode,
          created: data.created,
          updated: data.updated,
          done: data.done,
        };
      });
  } catch {
    return [];
  }
}

export function getSessionStatus(sessionId) {
  const session = getSession(sessionId);
  if (!session) {
    return {
      messages: [],
      done: true,
      error: undefined,
      tokensUsed: 0,
      tokensTotal: TOKEN_LIMIT,
      aborted: false,
      id: sessionId,
    };
  }
  return {
    messages: session.messages.filter((m) => m.role !== "system"),
    done: session.done,
    error: session.error,
    tokensUsed: session.tokensUsed ?? 0,
    tokensTotal: TOKEN_LIMIT,
    aborted: abortControllers.has(sessionId),
    id: sessionId,
  };
}
