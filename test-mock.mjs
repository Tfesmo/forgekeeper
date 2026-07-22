import express from "express";
import http from "node:http";
import { clearConversation, getConversation, setConversation } from "./src/stores/conversationStore.js";
import { buildSystemMessages } from "./src/services/llmService.js";

clearConversation("default");

const mockResponses = [{ choices: [{ message: { content: "test response" } }] }];

function createMockLLMRouter(responses) {
  const { Router } = express;
  const router = Router();
  const SESSION_ID = "default";

  router.post("/", async (req, res) => {
    const { messages, role } = req.body;
    const conv = getConversation(SESSION_ID);
    if (!conv) {
      const systemMessages = buildSystemMessages(role);
      setConversation(SESSION_ID, {
        messages: [...systemMessages, ...messages.map((msg) => ({ role: msg.role, text: msg.text }))],
        done: false,
        error: undefined,
        role,
      });
    } else {
      conv.messages.push(...messages.map((msg) => ({ role: msg.role, text: msg.text })));
    }
    conv.role = role;

    const response = responses.shift();
    const content = response ? (response.choices?.[0]?.message?.content || "[No response]") : "[No response]";
    
    setTimeout(() => {
      const c = getConversation(SESSION_ID);
      console.log("setTimeout: conv =", c);
      if (c) {
        c.messages.push({ role: "assistant", text: content });
        c.done = true;
        console.log("setTimeout: pushed assistant message, messages =", c.messages.length);
      }
    }, 10);

    res.json({ accepted: true });
  });

  router.get("/status", (_, res) => {
    const conv = getConversation(SESSION_ID);
    if (!conv) {
      return res.json({ messages: [], done: true });
    }
    console.log("status: messages =", conv.messages.length, "done =", conv.done);
    res.json({
      messages: conv.messages,
      done: conv.done,
      error: conv.error,
      tokensUsed: conv.tokensUsed ?? 0,
      tokensTotal: 64000,
    });
  });

  return router;
}

const chatRoutes = createMockLLMRouter(mockResponses);

const app = express();
app.use(express.json());
app.use("/api/chat", chatRoutes);

const server = app.listen(0);
const port = server.address().port;

http.get(`http://localhost:${port}/api/chat/status`, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("Initial status:", JSON.parse(data));
  });
});

const req = http.request(`http://localhost:${port}/api/chat`, { method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("POST response:", data);
    
    http.get(`http://localhost:${port}/api/chat/status`, (res2) => {
      let data2 = "";
      res2.on("data", (chunk) => (data2 += chunk));
      res2.on("end", () => {
        console.log("Status after POST:", JSON.parse(data2));
      });
    });
  });
});
req.write(JSON.stringify({ messages: [{ role: "user", text: "hello" }], role: "analyst" }));
req.end();

setTimeout(() => {
  http.get(`http://localhost:${port}/api/chat/status`, (res3) => {
    let data3 = "";
    res3.on("data", (chunk) => (data3 += chunk));
    res3.on("end", () => {
      console.log("Status after timeout:", JSON.parse(data3));
      server.close();
    });
  });
}, 100);
