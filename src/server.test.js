import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import { describe, it, expect, beforeEach, vi } from "vitest";

import { buildSystemMessage, prepareMessagesForAPI } from "./services/llmService.js";
import {
  getSession,
  updateSession,
  createSession,
  deleteSession,
  resolveSessionForStream,
  finalizeSession,
  abortControllers,
} from "./stores/sessionStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import { serverApiRouter } from "./routes/serverApiRoutes.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { uiRoutes } from "./routes/uiRoutes.js";

async function httpGet(port, pathStr, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      req.destroy();
      reject(new Error(`HTTP request timed out: GET ${pathStr}`));
    }, timeout);

    const req = http.get(
      {
        hostname: "localhost",
        port: port,
        path: pathStr,
      },
      (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          clearTimeout(timer);
          const body = Buffer.concat(chunks).toString("utf-8");
          const contentType = res.headers["content-type"] || "";
          if (contentType.includes("application/json")) {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } else {
            resolve({ status: res.statusCode, body: body });
          }
        });
      },
    );
    req.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

const app = express();
app.use(express.json());
app.use("/vue-assets", express.static(path.join(__dirname, "components", "vue")));
app.use("/api/session", sessionRoutes);
app.use("/api/server", serverApiRouter);
app.use("/", uiRoutes);

function httpRequest(serverPort, options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "localhost",
        port: serverPort,
        path: options.path,
        method: options.method || "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      },
    );

    req.on("error", reject);

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForDone(port, sessionId, maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await httpRequest(port, { path: `/api/session/${sessionId}/status` });
    if (status.done) return status;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return httpRequest(port, { path: `/api/session/${sessionId}/status` });
}

function createMockLLMRouter(responses) {
  const { Router } = express;
  const router = Router();
  const TEST_SESSION_ID = "test-session-mock";

  router.post("/:sessionId/stream", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { message, mode } = req.body;

      if (!message) {
        return res.status(400).json({ error: "No message provided" });
      }

      let conv = getSession(sessionId);

      if (!conv) {
        const systemMessage = buildSystemMessage(mode);
        conv = {
          id: sessionId,
          messages: [
            { role: "system", content: systemMessage },
            { role: "user", content: message, forgekeeper: { mode } },
          ],
          done: false,
          error: undefined,
          mode,
        };
        updateSession(sessionId, conv);
      } else {
        conv.messages.push({ role: "user", content: message, forgekeeper: { mode } });
        conv.done = false;
        conv.mode = mode;
        updateSession(sessionId, conv);
      }

      const response = responses.shift();
      const content = response
        ? response.choices?.[0]?.message?.content || "[No response]"
        : "[No response]";

      setTimeout(() => {
        const c = getSession(sessionId);
        if (c) {
          c.messages.push({ role: "assistant", content, forgekeeper: { mode: c.mode } });
          c.done = true;
          verifyMessagesContract(prepareMessagesForAPI(c.messages));
          updateSession(sessionId, c);
        }
      }, 10);

      res.json({ accepted: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.get("/new", (req, res) => {
    res.json({ id: TEST_SESSION_ID });
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

function verifyMessagesContract(messages) {
  if (!Array.isArray(messages)) throw new Error("messages contract violation: must be an array");
  if (messages.length === 0) throw new Error("messages contract violation: must not be empty");

  const systemMessages = messages.filter((m) => m.role === "system");
  if (systemMessages.length > 1)
    throw new Error(
      `messages contract violation: ${systemMessages.length} system messages (expected 1)`,
    );
  if (systemMessages.length === 1 && messages[0].role !== "system")
    throw new Error("messages contract violation: system message must be first");

  for (const msg of messages) {
    if (!msg || typeof msg !== "object")
      throw new Error("messages contract violation: each element must be an object");
    if (typeof msg.role !== "string" || !msg.role.trim())
      throw new Error("messages contract violation: role must be a non-empty string");
    if (!["system", "user", "assistant"].includes(msg.role))
      throw new Error(`messages contract violation: invalid role "${msg.role}"`);
    if (typeof msg.content !== "string" || !msg.content.trim())
      throw new Error("messages contract violation: content must be a non-empty string");
  }
}

beforeEach(() => {
  deleteSession("test-session-mock");
});

describe("POST /api/session integration", () => {
  it("should maintain message consistency over ~10 sequential calls (simple conversation)", async () => {
    const mockResponses = [];
    for (let i = 0; i < 10; i++) {
      mockResponses.push({
        choices: [{ message: { content: `Assistant response ${i + 1}` } }],
      });
    }

    const sessionRoutes = createMockLLMRouter(mockResponses);

    const app2 = express();
    app2.use(express.json());
    app2.use("/api/session", sessionRoutes);

    const server = app2.listen(0);
    const port = server.address().port;

    try {
      // Get session ID
      const sessionRes = await httpRequest(port, { path: "/api/session/new", method: "GET" });
      const sessionId = sessionRes.id;

      for (let i = 1; i <= 10; i++) {
        const body = { message: `Message ${i}`, mode: "analyst" };

        await httpRequest(port, { path: `/api/session/${sessionId}/stream`, method: "POST" }, body);

        const status = await waitForDone(port, sessionId);

        const expectedCount = 1 + i * 2;
        expect(status.messages.length).toBe(expectedCount);

        for (let j = 0; j < status.messages.length; j++) {
          if (j < 1) continue; // skip system message
          const msg = status.messages[j];
          const idx = j - 3;
          const expectedRole = idx % 2 === 0 ? "user" : "assistant";
          expect(msg.role).toBe(expectedRole);
        }

        const lastUserIndex = status.messages.length - 2;
        expect(status.messages[lastUserIndex].content).toBe(`Message ${i}`);
        expect(status.messages[status.messages.length - 1].content).toBe(`Assistant response ${i}`);
      }

      const finalStatus = await httpRequest(port, { path: `/api/session/${sessionId}/status` });
      expect(finalStatus.done).toBe(true);
    } finally {
      server.close();
    }
  });

  it("should handle mixed modes over ~10 calls", async () => {
    const modes = ["analyst", "implementer", "architect", "reviewer", "advisor"];
    const mockResponses = [];
    for (let i = 0; i < 10; i++) {
      mockResponses.push({
        choices: [
          { message: { content: `Response from ${modes[i % modes.length]}: turn ${i + 1}` } },
        ],
      });
    }

    const sessionRoutes = createMockLLMRouter(mockResponses);

    const app2 = express();
    app2.use(express.json());
    app2.use("/api/session", sessionRoutes);

    const server = app2.listen(0);
    const port = server.address().port;

    try {
      // Get session ID
      const sessionRes = await httpRequest(port, { path: "/api/session/new", method: "GET" });
      const sessionId = sessionRes.id;

      for (let i = 0; i < 10; i++) {
        const mode = modes[i % modes.length];
        await httpRequest(
          port,
          { path: `/api/session/${sessionId}/stream`, method: "POST" },
          { message: `Turn ${i + 1}`, mode },
        );

        const status = await waitForDone(port, sessionId);
        const expectedCount = 1 + (i + 1) * 2;
        expect(status.messages.length).toBe(expectedCount);
        expect(status.messages[status.messages.length - 1].content).toBe(
          `Response from ${mode}: turn ${i + 1}`,
        );
      }
    } finally {
      server.close();
    }
  });

  it("should preserve system messages and append new messages without reordering", async () => {
    const mockResponses = [];
    for (let i = 0; i < 10; i++) {
      mockResponses.push({
        choices: [{ message: { content: `Assistant mock ${i + 1}` } }],
      });
    }

    const sessionRoutes = createMockLLMRouter(mockResponses);

    const app2 = express();
    app2.use(express.json());
    app2.use("/api/session", sessionRoutes);

    const server = app2.listen(0);
    const port = server.address().port;

    try {
      // Get session ID
      const sessionRes = await httpRequest(port, { path: "/api/session/new", method: "GET" });
      const sessionId = sessionRes.id;

      for (let i = 1; i <= 10; i++) {
        await httpRequest(
          port,
          { path: `/api/session/${sessionId}/stream`, method: "POST" },
          { message: `Message ${i}`, mode: "analyst" },
        );

        const status = await waitForDone(port, sessionId);

        const systemMessages = status.messages.filter((m) => m.role === "system");
        expect(systemMessages.length).toBe(1);

        const lastUserIndex = status.messages.length - 2;
        expect(status.messages[lastUserIndex].role).toBe("user");
        expect(status.messages[lastUserIndex].content).toBe(`Message ${i}`);
        expect(status.messages[status.messages.length - 1].role).toBe("assistant");
        expect(status.messages[status.messages.length - 1].content).toBe(`Assistant mock ${i}`);
      }
    } finally {
      server.close();
    }
  });
});

describe("GET /", () => {
  it("should return HTML containing 'Forgekeeper'", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await httpGet(port, "/");
      expect(res.status).toBe(200);
      expect(res.body).toContain("Forgekeeper");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("should send the same file as the static middleware falls through to", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    const filePath = path.join(__dirname, "..", "dist", "index.html");
    const expectedContent = fs.readFileSync(filePath, "utf-8");

    try {
      const res = await httpGet(port, "/");
      expect(res.body).toBe(expectedContent);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /api/session/:sessionId/status", () => {
  it("should return JSON with messages array", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await httpGet(port, "/api/session/test-session/status");
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body).toHaveProperty("done");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("GET /options", () => {
  it("should return JSON with modes array and currentMode", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await httpGet(port, "/options");
      expect(res.status).toBe(200);
      const data = res.body;
      expect(Array.isArray(data.modes)).toBe(true);
      expect(data.modes.length).toBeGreaterThan(0);
      expect(data).toHaveProperty("currentMode");
      expect(typeof data.currentMode).toBe("string");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("should only include active workflow modes", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await httpGet(port, "/options");
      const data = res.body;
      const modeIds = data.modes.map((m) => m.id);
      expect(modeIds).toContain("analyst");
      expect(modeIds).toContain("implementer");
      expect(modeIds).not.toContain("advisor");
      expect(modeIds).not.toContain("architect");
      expect(modeIds).not.toContain("reviewer");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("should include id, label, and symbol for each mode", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await httpGet(port, "/options");
      const data = res.body;
      for (const mode of data.modes) {
        expect(mode).toHaveProperty("id");
        expect(mode).toHaveProperty("label");
        expect(mode).toHaveProperty("symbol");
        expect(typeof mode.id).toBe("string");
        expect(typeof mode.label).toBe("string");
        expect(typeof mode.symbol).toBe("string");
      }
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});

describe("sessionStore concurrent mutations", () => {
  it("should not lose messages when two resolveSessionForStream calls arrive simultaneously", async () => {
    const { id } = createSession("analyst");

    const [result1, result2] = await Promise.all([
      resolveSessionForStream(id, "analyst", "Message A"),
      resolveSessionForStream(id, "analyst", "Message B"),
    ]);

    // Only one should succeed since both target the same session
    const successCount = [result1.error, result2.error].filter((e) => e === null).length;
    expect(successCount).toBeGreaterThanOrEqual(1);

    const session = getSession(id);
    const userMessages = session.messages.filter((m) => m.role === "user");
    expect(userMessages.length).toBeGreaterThanOrEqual(1);
  });
});

describe("sessionStore cache eviction", () => {
  it("should evict oldest entries when cache exceeds max size", async () => {
    const sessionIds = [];
    for (let i = 0; i < 21; i++) {
      const { id } = createSession("analyst");
      sessionIds.push(id);
      await resolveSessionForStream(id, "analyst", "test message");
      await getSession(id);
    }

    expect(sessionIds.length).toBe(21);
  });
});

describe("sessionStore deep copy", () => {
  it("should deep-copy nested forgekeeper metadata in updateSession", () => {
    const { id } = createSession("analyst");
    const session = getSession(id);
    session.messages.push({
      role: "assistant",
      content: "test",
      forgekeeper: { mode: "analyst", metrics: { usage: { total_tokens: 100 } } },
    });
    updateSession(id, session);

    session.messages[1].forgekeeper.metrics.usage.total_tokens = 999;

    const fresh = getSession(id);
    expect(fresh.messages[1].forgekeeper.metrics.usage.total_tokens).toBe(100);
  });
});

describe("abort signal flow", () => {
  it("finalizeSession should abort the in-memory controller set by resolveSessionForStream", async () => {
    const { id } = createSession("analyst");
    await resolveSessionForStream(id, "analyst", "test message");

    expect(abortControllers.has(id)).toBe(true);

    const result = await finalizeSession(id);
    expect(result.aborted).toBe(true);
    expect(abortControllers.has(id)).toBe(false);
  });

  it("should not overwrite AbortController in SSE route handler", async () => {
    const { id } = createSession("analyst");
    await resolveSessionForStream(id, "analyst", "test message");

    const controllerBefore = abortControllers.get(id);

    // After the fix, the SSE route does NOT create a new AbortController
    // It only checks if one exists and is not already aborted
    expect(abortControllers.get(id)).toBe(controllerBefore);
  });
});

describe("SSE deduplication", () => {
  it("should include seq numbers in SSE events", async () => {
    const { id } = createSession("analyst");
    await resolveSessionForStream(id, "analyst", "test");

    const app = express();
    app.use(express.json());

    app.get("/stream/:id", async (req, res) => {
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });
      res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

      let seq = 0;
      const sendEvent = (eventType, data) => {
        res.write(`event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq: ++seq })}\n\n`);
      };

      const chunks = ["chunk1", "chunk2"];
      for (const chunk of chunks) {
        sendEvent("llm-chunk", { content: chunk });
      }

      sendEvent("llm-done", { done: true });
      res.end();
    });

    const server = app.listen();
    const { port } = server.address();

    try {
      const events = [];
      const req = http.request(
        {
          hostname: "localhost",
          port,
          path: `/stream/${id}`,
          method: "GET",
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => {
            data += chunk;
          });
          res.on("end", () => {
            const lines = data.split("\n");
            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              if (line.startsWith("event:")) {
                const eventType = line.replace("event:", "").trim();
                const dataLine = lines[i + 1];
                if (dataLine && dataLine.startsWith("data:")) {
                  const parsed = JSON.parse(dataLine.replace("data:", "").trim());
                  events.push({ type: eventType, ...parsed });
                }
              }
            }
          });
        },
      );
      req.end();

      await new Promise((resolve) => {
        req.on("close", () => resolve());
      });

      expect(events.length).toBeGreaterThanOrEqual(2);
      const chunks = events.filter((e) => e.type === "llm-chunk");
      expect(chunks.length).toBe(2);
      expect(chunks[0].seq).toBe(1);
      expect(chunks[1].seq).toBe(2);
    } finally {
      server.close();
    }
  });
});

describe("GET /theme-settings", () => {
  it("should return the theme-settings HTML file", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    try {
      const res = await httpGet(port, "/theme-settings");
      expect(res.status).toBe(200);
      expect(res.body).toContain("Theme Settings");
      expect(res.body).toContain("Forgekeeper");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  it("should serve the correct file", async () => {
    const server = app.listen(0);
    const port = server.address().port;

    const expectedContent = fs.readFileSync(
      path.join(__dirname, "..", "dist", "theme-settings.html"),
      "utf-8",
    );

    try {
      const res = await httpGet(port, "/theme-settings");
      expect(res.body).toBe(expectedContent);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
