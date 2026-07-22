import { Router } from "express";
import { v4 as uuidv4 } from "uuid";

import { callLLM, callLLMStreaming, buildSystemMessage } from "../services/llmService.js";
import {
  createSession,
  getSession,
  updateSession,
  deleteSession,
  getActiveSessionId,
} from "../stores/sessionStore.js";

const router = Router();

// Create a new session
router.post("/sessions/new", (req, res) => {
  try {
    const { mode } = req.body;
    const sessionId = uuidv4();
    const { session } = createSession(mode, {
      id: sessionId,
      messages: [{ role: "system", content: buildSystemMessage(mode) }],
      done: false,
      error: undefined,
      mode,
      abortController: null,
    });
    console.log("Session created:", sessionId);
    res.json({ id: sessionId, session });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List sessions
router.get("/sessions", (req, res) => {
  try {
    const sessions = Object.keys(getSession());
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message to a session (non-streaming, for backward compatibility)
router.post("/", async (req, res) => {
  try {
    const { message, mode } = req.body;
    const sessionId = req.query?.sessionId || req.body?.sessionId;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    const session = getSession(sessionId);

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    if (session.abortController) {
      return res.status(409).json({ error: "Already processing a request for this session" });
    }

    session.messages.push({ role: "user", content: message, forgekeeper: { mode } });
    session.mode = mode;
    session.done = false;
    session.error = undefined;

    const abortController = new AbortController();
    session.abortController = abortController;

    req.on("close", () => {
      if (!res.writableEnded && session.abortController) {
        session.abortController.abort();
      }
      session.abortController = null;
      session.done = true;
      updateSession(sessionId, session);
    });

    callLLM(session, abortController.signal).then(() => {
      updateSession(sessionId, session);
    });

    res.json({ accepted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept a streaming request (client POSTs message first)
router.post("/stream", (req, res) => {
  const { message, mode } = req.body;
  const sessionId = req.query?.sessionId || req.body?.sessionId;

  if (!message) {
    return res.status(400).json({ error: "No message provided" });
  }

  if (!sessionId) {
    return res.status(400).json({ error: "sessionId is required" });
  }

  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (session.abortController) {
    return res.status(409).json({ error: "Already processing a request for this session" });
  }

  session.messages.push({ role: "user", content: message, forgekeeper: { mode } });
  session.mode = mode;
  session.done = false;
  session.error = undefined;

  updateSession(sessionId, session);

  const abortController = new AbortController();
  session.abortController = abortController;

  console.log("Stream accepted - sessionId:", sessionId);
  res.json({ accepted: true });
});

// SSE stream endpoint (client connects via EventSource)
router.get("/stream/:sessionId", (req, res) => {
  const sessionId = req.params.sessionId;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: "Session not found" });
  }

  if (session.abortController) {
    return res.status(409).json({ error: "Already processing a request for this session" });
  }

  const abortController = new AbortController();
  session.abortController = abortController;

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
      abortController.abort();
      session.abortController = null;
      session.done = true;
      updateSession(sessionId, session);
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

      updateSession(sessionId, session);

      // Send done event with final message
      if (!req.destroyed) {
        const lastMsg = session.messages[session.messages.length - 1];
        sendEvent("llm-done", { message: lastMsg, done: true });
      }
      res.end();
    } catch (err) {
      updateSession(sessionId, session);
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
router.post("/abort", (req, res) => {
  try {
    const sessionId = req.body?.sessionId;
    const session = getSession(sessionId);
    if (!session || !session.abortController) {
      return res.json({ aborted: false, error: "No active request to abort" });
    }
    session.abortController.abort();
    session.abortController = null;
    session.done = true;
    updateSession(sessionId, session);
    res.json({ aborted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session status
router.get("/status", (req, res) => {
  const sessionId = req.query?.sessionId;
  const session = getSession(sessionId);
  if (!session) {
    return res.json({ messages: [], done: true });
  }
  res.json({
    messages: session.messages.filter((m) => m.role !== "system"),
    done: session.done,
    error: session.error,
    tokensUsed: session.tokensUsed ?? 0,
    tokensTotal: 64000,
    aborted: session.abortController !== null,
    id: sessionId,
  });
});

export { router as chatRoutes };
