import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  rmSync,
  readdirSync,
  existsSync,
  renameSync,
} from "fs";
import { join, isAbsolute } from "path";

import { v4 as uuidv4 } from "uuid";

import { buildSystemMessage } from "../services/llmService.js";

/**
 * Per-session write lock to prevent concurrent mutation races.
 * Only one async operation can hold the lock at a time per session.
 */
const writeLocks = new Map();

/**
 * Acquires a per-session lock and executes fn atomically.
 * Waits for any in-progress operation on the same session to complete.
 */
async function withLock(sessionId, fn) {
  while (writeLocks.has(sessionId)) {
    await writeLocks.get(sessionId);
  }
  let release;
  const promise = new Promise((r) => {
    release = r;
  });
  writeLocks.set(sessionId, promise);
  try {
    return await fn();
  } finally {
    writeLocks.delete(sessionId);
    release();
  }
}

/**
 * Maximum number of sessions to keep in the in-memory cache.
 * Evicts oldest entries when the limit is exceeded.
 */
const MAX_CACHE_SIZE = 20;

/**
 * Evicts the oldest entry from the session cache (FIFO).
 */
function evictOldest() {
  const firstKey = sessionCache.keys().next().value;
  sessionCache.delete(firstKey);
}

/**
 * Resolves a session for a new streaming request.
 * If session doesn't exist, creates it with system message and appends user message.
 * If session already has an active stream, returns an error.
 * Returns { session, error } where error is null on success.
 */
export async function resolveSessionForStream(sessionId, mode, message) {
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

    // Check if already streaming
    if (abortControllers.has(sessionId)) {
      const existingController = abortControllers.get(sessionId);
      if (existingController && !existingController.signal.aborted) {
        return { session: null, error: "Already processing a request for this session" };
      }
    }

    // Append user message
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

const rawSessionDir = process.env.SESSION_DIR || ".forgekeeper/sessions";
const SESSION_DIR = isAbsolute(rawSessionDir) ? rawSessionDir : join(process.cwd(), rawSessionDir);

// In-memory cache: Map<sessionId, sessionData>
const sessionCache = new Map();

// In-memory store for AbortControllers (cannot be persisted to disk)
export const abortControllers = new Map();

function ensureSessionDir() {
  if (!existsSync(SESSION_DIR)) {
    mkdirSync(SESSION_DIR, { recursive: true });
  }
}

/**
 * Creates a new session with a unique UUID.
 * Returns both the UUID and the session object.
 * File is created immediately on disk.
 */
export function createSession(mode, overrides = {}) {
  ensureSessionDir();
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
  sessionCache.set(id, session);
  writeFileSync(join(SESSION_DIR, `${id}.json`), JSON.stringify(session, null, 2));
  return { id, session };
}

/**
 * Retrieves a session by ID. Always reads from file to get latest state.
 * Returns null if session not found.
 */
export function getSession(sessionId) {
  const file = join(SESSION_DIR, `${sessionId}.json`);
  try {
    const data = JSON.parse(readFileSync(file, "utf-8"));
    sessionCache.set(sessionId, data);
    if (sessionCache.size > MAX_CACHE_SIZE) {
      evictOldest();
    }
    return data;
  } catch {
    sessionCache.delete(sessionId);
    return null;
  }
}

/**
 * Updates a session: writes to temp file then atomically renames,
 * and updates in-memory cache.
 * Automatically updates the `updated` timestamp.
 */
export function updateSession(sessionId, data) {
  const session = { ...data, updated: Date.now() };
  if (Array.isArray(session.messages)) {
    session.messages = session.messages.map((msg) => structuredClone(msg));
  }
  sessionCache.set(sessionId, session);
  if (sessionCache.size > MAX_CACHE_SIZE) {
    evictOldest();
  }
  const file = join(SESSION_DIR, `${sessionId}.json`);
  const tmpFile = file + ".tmp." + process.pid;
  writeFileSync(tmpFile, JSON.stringify(session, null, 2));
  renameSync(tmpFile, file);
  return session;
}

/**
 * Deletes a session from both disk and cache.
 */
export function deleteSession(sessionId) {
  sessionCache.delete(sessionId);
  try {
    rmSync(join(SESSION_DIR, `${sessionId}.json`));
  } catch {
    // File may already be deleted
  }
}

/**
 * Returns the first session that has an active request (AbortController set).
 * Returns null if no active sessions.
 */
export function getActiveSessionId() {
  for (const id of abortControllers.keys()) {
    const controller = abortControllers.get(id);
    if (controller && !controller.signal.aborted) return id;
  }
  return null;
}

/**
 * Lists all sessions (metadata only).
 * Useful for future session history UI.
 */
export function listSessions() {
  ensureSessionDir();
  try {
    const files = readdirSync(SESSION_DIR);
    return files
      .filter((f) => f.endsWith(".json"))
      .map((f) => {
        const data = JSON.parse(readFileSync(join(SESSION_DIR, f), "utf-8"));
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

/**
 * Finalizes a session: aborts controller, marks done, and persists.
 * Returns { aborted: true } if session had an active controller,
 * { aborted: false, error: string } otherwise.
 */
export async function finalizeSession(sessionId) {
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

/**
 * Returns a session status object for API responses.
 */
export function getSessionStatus(sessionId) {
  const session = getSession(sessionId);
  if (!session) {
    return {
      messages: [],
      done: true,
      error: undefined,
      tokensUsed: 0,
      tokensTotal: 64000,
      aborted: false,
      id: sessionId,
    };
  }
  return {
    messages: session.messages.filter((m) => m.role !== "system"),
    done: session.done,
    error: session.error,
    tokensUsed: session.tokensUsed ?? 0,
    tokensTotal: 64000,
    aborted: abortControllers.has(sessionId),
    id: sessionId,
  };
}

/**
 * Finalizes a session on successful LLM completion.
 * Pushes assistant message, marks done, clears error, persists.
 */
export async function finalizeSessionOnSuccess(sessionId, assistantMessage) {
  return withLock(sessionId, async () => {
    const session = getSession(sessionId);
    if (!session) return;
    session.messages.push(assistantMessage);
    session.done = true;
    session.error = undefined;
    abortControllers.delete(sessionId);
    updateSession(sessionId, session);
  });
}

/**
 * Finalizes a session on LLM error.
 * Marks done=false, sets error, clears AbortController, persists.
 */
export async function finalizeSessionOnError(sessionId, errorMessage) {
  return withLock(sessionId, async () => {
    const session = getSession(sessionId);
    if (!session) return;
    session.error = errorMessage;
    session.done = false;
    abortControllers.delete(sessionId);
    updateSession(sessionId, session);
  });
}
