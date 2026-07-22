import { Router } from "express";

import { callLLM, buildSystemMessage } from "../services/llmService.js";
import { getConversation, setConversation } from "../stores/conversationStore.js";

const router = Router();
const SESSION_ID = "default";

router.post("/", async (req, res) => {
  try {
    const { message, mode } = req.body;

    if (!message) {
      return res.status(400).json({ error: "No message provided" });
    }

    let conv = getConversation(SESSION_ID);

    if (!conv) {
      conv = setConversation(SESSION_ID, {
        messages: [{ role: "system", content: buildSystemMessage(mode) }],
        done: false,
        error: undefined,
        mode,
        abortController: null,
      });
    }

    if (conv.abortController) {
      return res.status(409).json({ error: "Already processing a request for this session" });
    }

    conv.messages.push({ role: "user", content: message, forgekeeper: { mode } });
    conv.mode = mode;
    conv.done = false;
    conv.error = undefined;

    const abortController = new AbortController();
    conv.abortController = abortController;

    callLLM(conv, abortController.signal);

    res.json({ accepted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/abort", (_, res) => {
  const conv = getConversation(SESSION_ID);
  if (!conv || !conv.abortController) {
    return res.json({ aborted: false, error: "No active request to abort" });
  }
  conv.abortController.abort();
  conv.abortController = null;
  res.json({ aborted: true });
});

router.get("/status", (_, res) => {
  const conv = getConversation(SESSION_ID);
  if (!conv) {
    return res.json({ messages: [], done: true });
  }
  res.json({
    messages: conv.messages.filter((m) => m.role !== "system"),
    done: conv.done,
    error: conv.error,
    tokensUsed: conv.tokensUsed ?? 0,
    tokensTotal: 64000,
    aborted: conv.abortController !== null,
  });
});

export { router as chatRoutes };
