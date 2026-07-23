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

  // Set SSE headers using writeHead per guide
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial connected event
  res.write("data: " + JSON.stringify({ type: "connected" }) + "\n\n");

  let finalized = false;
  const markFinalized = () => {
    if (finalized) return false;
    finalized = true;
    return true;
  };

  // Handle client disconnect
  req.on("close", () => {
    if (markFinalized() && !res.writableEnded) {
      finalizeSession(sessionId).catch(() => {});
    }
  });

  // Set up streaming callback with distinct events and deduplication sequence
  let seq = 0;
  const sendEvent = (eventType, data) => {
    if (req.destroyed) return;
    res.write(`event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq: ++seq })}\n\n`);
  };

  (async () => {
    const ac = abortControllers.get(sessionId);
    try {
      await callLLMStreaming(session, ac.signal, (chunk, type) => {
        const eventType = type === "reasoning" ? "llm-reasoning" : "llm-chunk";
        sendEvent(eventType, { content: chunk });
      });

      const refreshedSession = getSession(sessionId);
      const lastMsg = refreshedSession.messages[refreshedSession.messages.length - 1];
      sendEvent("llm-done", { message: lastMsg, done: true });
      markFinalized();
      res.end();
    } catch (err) {
      markFinalized();
      if (!req.destroyed) {
        if (ac.signal.aborted) {
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
