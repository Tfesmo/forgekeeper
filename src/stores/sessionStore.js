import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, existsSync } from "fs";
import { join } from "path";
import { v4 as uuidv4 } from "uuid";

import { buildSystemMessage } from "../services/llmService.js";

/**
 * Resolves a session for a new streaming request.
 * If session doesn't exist, creates it with system message and appends user message.
 * If session already has an active stream, returns an error.
 * Returns { session, error } where error is null on success.
 */
export function resolveSessionForStream(sessionId, mode, message) {
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
  if (session.abortController) {
    return { session: null, error: "Already processing a request for this session" };
  }

  // Append user message
  session.messages = session.messages || [];
  session.messages.push({ role: "user", content: message, forgekeeper: { mode } });
  session.mode = mode;
  session.done = false;
  session.error = undefined;

  updateSession(sessionId, session);
  return { session, error: null };
}

const SESSION_DIR = join(process.cwd(), ".forgekeeper", "sessions");

// In-memory cache: Map<sessionId, sessionData>
const sessionCache = new Map();

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
    return data;
  } catch {
    sessionCache.delete(sessionId);
    return null;
  }
}

/**
 * Updates a session: writes to file and updates in-memory cache.
 * Automatically updates the `updated` timestamp.
 */
export function updateSession(sessionId, data) {
  const session = { ...data, updated: Date.now() };
  sessionCache.set(sessionId, session);
  writeFileSync(join(SESSION_DIR, `${sessionId}.json`), JSON.stringify(session, null, 2));
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
 * Returns the first session that has an active request (abortController set).
 * Returns null if no active sessions.
 */
export function getActiveSessionId() {
  for (const [id, session] of sessionCache) {
    if (session.abortController) return id;
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


