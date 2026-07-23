import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

import { callLLMStreaming } from "../services/llmService.js";
import {
  getSession,
  updateSession,
  resolveSessionForStream,
  listSessions,
  finalizeSession,
  getSessionStatus,
  abortControllers,
} from "../stores/sessionStore.js";
import { createStreamHandler } from "../services/telemetry/streamHandler.js";
import { getEmitter } from "../services/telemetry/shared.js";

const router = Router();

// Generate a new session ID
router.get("/new", (req, res) => {
  const sessionId = uuidv4();
  res.json({ id: sessionId });
});

// List all sessions
router.get("/sessions", (req, res) => {
  try {
    const sessions = listSessions();
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept a streaming request (client POSTs message first)
router.post("/:sessionId/stream", async (req, res) => {
  const { sessionId } = req.params;
  const { message, mode } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  if (!mode) {
    return res.status(400).json({ error: "Mode is required" });
  }

  const { session, error } = await resolveSessionForStream(sessionId, mode, message);

  if (error) {
    return res.status(409).json({ error });
  }

  const ac = abortControllers.get(sessionId);
  if (ac) {
    session.abortController = ac;
    updateSession(sessionId, session);
  }

  res.json({ accepted: true });
});

// SSE stream endpoint (client connects via EventSource)
router.get("/:sessionId/stream", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  const stream = createStreamHandler(req, res, getEmitter());

  let finalized = false;
  const markFinalized = () => {
    if (finalized) return false;
    finalized = true;
    return true;
  };

  const ac = abortControllers.get(sessionId);
  const streamPromise = (async () => {
    try {
      await callLLMStreaming(session, ac.signal, (chunk, type) => {
        const eventType = type === "reasoning" ? "llm-reasoning" : "llm-chunk";
        stream.sendEvent(eventType, { content: chunk });
      });

      const refreshedSession = getSession(sessionId);
      const lastMsg = refreshedSession?.messages?.[refreshedSession.messages.length - 1];
      stream.sendEvent("llm-done", { message: lastMsg, done: true });
    } catch (err) {
      if (!req.destroyed) {
        if (ac?.signal.aborted) {
          stream.sendEvent("llm-done", { done: true, aborted: true });
        } else {
          stream.sendEvent("llm-error", { error: err.message, done: true });
        }
      }
    } finally {
      stream.writer.end();
    }
  })();

  streamPromise.catch(() => {});

  req.on("close", () => {
    if (markFinalized()) {
      finalizeSession(sessionId).catch(() => {});
    }
    stream.onDisconnect();
  });
});

// Abort a session
router.post("/:sessionId/abort", async (req, res) => {
  try {
    const result = await finalizeSession(req.params.sessionId);
    if (!result.aborted) {
      return res.status(409).json(result);
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session status
router.get("/:sessionId/status", (req, res) => {
  res.json(getSessionStatus(req.params.sessionId));
});

export { router as sessionRoutes };
