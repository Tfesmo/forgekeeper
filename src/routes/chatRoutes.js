import { Router } from "express";
import { getConversation, setConversation } from "../stores/conversationStore.js";
import { callLLM, buildSystemMessage } from "../services/llmService.js";

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
        messages: [{ role: 'system', content: buildSystemMessage(mode) }],
        done: false,
        error: undefined,
        mode,
      });
    }

    conv.messages.push({ role: 'user', content: message });
    
    callLLM(conv);

    res.json({ accepted: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", (_, res) => {
  const conv = getConversation(SESSION_ID);
  if (!conv) {
    return res.json({ messages: [], done: true });
  }
  res.json({
    messages: conv.messages.filter(m => m.role !== "system"),
    done: conv.done,
    error: conv.error,
    tokensUsed: conv.tokensUsed ?? 0,
    tokensTotal: 64000,
  });
});

export { router as chatRoutes };
