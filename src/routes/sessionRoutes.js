import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

import { callLLMStreaming, buildSystemMessage } from "../services/llmService.js";
import {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getActiveSessionId,
  resolveSessionForStream,
  listSessions,
  finalizeSession,
  getSessionStatus,
  finalizeSessionOnSuccess,
  finalizeSessionOnError,
} from "../stores/sessionStore.js";

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
router.post("/:sessionId/stream", (req, res) => {
  const { sessionId } = req.params;
  const { message, mode } = req.body;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  if (!mode) {
    return res.status(400).json({ error: "Mode is required" });
  }

  const { session, error } = resolveSessionForStream(sessionId, mode, message);

  if (error) {
    return res.status(409).json({ error });
  }

  const abortController = new AbortController();
  session.abortController = abortController;

  console.log("Stream accepted - sessionId:", sessionId);
  res.json({ accepted: true });
});

// SSE stream endpoint (client connects via EventSource)
router.get("/:sessionId/stream", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (session.abortController) {
    return res.status(409).json({ error: "Already processing a request for this session" });
  }

  session.abortController = new AbortController();

  // Set SSE headers using writeHead per guide
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
  });

  // Send initial connected event
  res.write("data: " + JSON.stringify({ type: "connected" }) + "\n\n");

  // Handle client disconnect
  req.on("close", () => {
    if (!res.writableEnded) {
      finalizeSession(sessionId);
    }
  });

  // Set up streaming callback with distinct event types
  const sendEvent = (eventType, data) => {
    if (req.destroyed) return;
    res.write(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  (async () => {
    try {
      await callLLMStreaming(
        session,
        abortController.signal,
        (chunk, type) => {
          const eventType = type === "reasoning" ? "llm-reasoning" : "llm-chunk";
          sendEvent(eventType, { content: chunk });
        }
      );

      const lastMsg = session.messages[session.messages.length - 1];
      sendEvent("llm-done", { message: lastMsg, done: true });
      res.end();
    } catch (err) {
      if (!req.destroyed) {
        if (abortController.signal.aborted) {
          sendEvent("llm-done", { done: true, aborted: true });
        } else {
          sendEvent("llm-error", { error: err.message, done: true });
        }
      }
      res.end();
    }
  })();
});

// Abort a session
router.post("/:sessionId/abort", (req, res) => {
  try {
    const result = finalizeSession(req.params.sessionId);
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
