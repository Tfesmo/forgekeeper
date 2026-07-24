import express from "express";
import http from "node:http";
import { getSession, updateSession, createSession } from "./src/stores/sessionLifecycle.js";
import { buildSystemMessage } from "./src/services/llmService.js";

const mockResponses = [{ choices: [{ message: { content: "test response" } }] }];

function createMockLLMRouter(responses) {
  const { Router } = express;
  const router = Router();
  const SESSION_ID = "test-session-mock";

  router.post("/:sessionId/stream", async (req, res) => {
    const { sessionId } = req.params;
    const { message, mode } = req.body;
    let conv = getSession(sessionId);

    if (!conv) {
      conv = createSession(mode || "analyst", {
        id: sessionId,
        messages: [
          { role: "system", content: buildSystemMessage(mode || "analyst") },
          { role: "user", content: message, forgekeeper: { mode: mode || "analyst" } },
        ],
        mode: mode || "analyst",
        done: false,
        abortController: null,
      });
    } else {
      conv.messages.push({ role: "user", content: message, forgekeeper: { mode: mode || "analyst" } });
      conv.done = false;
      conv.mode = mode || "analyst";
    }

    updateSession(sessionId, conv);

    const response = responses.shift();
    const content = response ? (response.choices?.[0]?.message?.content || "[No response]") : "[No response]";

    setTimeout(() => {
      const c = getSession(sessionId);
      if (c) {
        c.messages.push({ role: "assistant", content });
        c.done = true;
        updateSession(sessionId, c);
      }
    }, 10);

    res.json({ accepted: true });
  });

  router.get("/new", (req, res) => {
    res.json({ id: SESSION_ID });
  });

  router.get("/:sessionId/status", (req, res) => {
    const sessionId = req.params.sessionId;
    const conv = getSession(sessionId);
    if (!conv) {
      return res.json({ messages: [], done: true });
    }
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

const sessionRoutes = createMockLLMRouter(mockResponses);

const app = express();
app.use(express.json());
app.use("/api/session", sessionRoutes);

const server = app.listen(0);
const port = server.address().port;

http.get(`http://localhost:${port}/api/session/test-session-mock/status`, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("Initial status:", JSON.parse(data));
  });
});

const postReq = http.request(`http://localhost:${port}/api/session/test-session-mock/stream`, { method: "POST", headers: { "Content-Type": "application/json" } }, (res) => {
  let data = "";
  res.on("data", (chunk) => (data += chunk));
  res.on("end", () => {
    console.log("POST response:", data);

    http.get(`http://localhost:${port}/api/session/test-session-mock/status`, (res2) => {
      let data2 = "";
      res2.on("data", (chunk) => (data2 += chunk));
      res2.on("end", () => {
        console.log("Status after POST:", JSON.parse(data2));
      });
    });
  });
});
postReq.write(JSON.stringify({ message: "hello", mode: "analyst" }));
postReq.end();

setTimeout(() => {
  http.get(`http://localhost:${port}/api/session/test-session-mock/status`, (res3) => {
    let data3 = "";
    res3.on("data", (chunk) => (data3 += chunk));
    res3.on("end", () => {
      console.log("Status after timeout:", JSON.parse(data3));
      server.close();
    });
  });
}, 100);
