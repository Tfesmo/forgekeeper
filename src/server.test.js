import { describe, it, expect, beforeEach } from "vitest";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { clearConversation, getConversation, setConversation } from "./stores/conversationStore.js";
import { buildSystemMessage } from "./services/llmService.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use("/vue-assets", express.static(path.join(__dirname, "components", "vue")));
app.use("/", (_req, _res) => {});

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
      }
    );

    req.on("error", reject);

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function waitForDone(port, maxAttempts = 50) {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await httpRequest(port, { path: "/api/chat/status" });
    if (status.done) return status;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  return httpRequest(port, { path: "/api/chat/status" });
}

function createMockLLMRouter(responses) {
  const { Router } = express;
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
        const systemMessage = buildSystemMessage(mode);
        setConversation(SESSION_ID, {
          messages: [{ role: "system", content: systemMessage }, { role: "user", content: message }],
          done: false,
          error: undefined,
          mode,
        });
        conv = getConversation(SESSION_ID);
      } else {
        conv.messages.push({ role: "user", content: message });
        conv.done = false;
      }
      conv.mode = mode;

      const response = responses.shift();
      const content = response ? (response.choices?.[0]?.message?.content || "[No response]") : "[No response]";
      
      setTimeout(() => {
        const c = getConversation(SESSION_ID);
        if (c) {
          c.messages.push({ role: "assistant", content });
          c.done = true;
          verifyMessagesContract(c.messages);
        }
      }, 10);

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

  const systemMessages = messages.filter(m => m.role === "system");
  if (systemMessages.length > 1) throw new Error(`messages contract violation: ${systemMessages.length} system messages (expected 1)`);
  if (systemMessages.length === 1 && messages[0].role !== "system") throw new Error("messages contract violation: system message must be first");

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") throw new Error("messages contract violation: each element must be an object");
    if (typeof msg.role !== "string" || !msg.role.trim()) throw new Error("messages contract violation: role must be a non-empty string");
    if (!["system", "user", "assistant"].includes(msg.role)) throw new Error(`messages contract violation: invalid role "${msg.role}"`);
    if (typeof msg.content !== "string" || !msg.content.trim()) throw new Error("messages contract violation: content must be a non-empty string");
  }
}

beforeEach(() => {
  clearConversation("default");
});

describe("POST /api/chat integration", () => {
  it("should maintain message consistency over ~10 sequential calls (simple conversation)", async () => {
    const mockResponses = [];
    for (let i = 0; i < 10; i++) {
      mockResponses.push({
        choices: [{ message: { content: `Assistant response ${i + 1}` } }],
      });
    }

    const chatRoutes = createMockLLMRouter(mockResponses);

    const app2 = express();
    app2.use(express.json());
    app2.use("/api/chat", chatRoutes);

    const server = app2.listen(0);
    const port = server.address().port;

    try {
      for (let i = 1; i <= 10; i++) {
        const body = { message: `Message ${i}`, mode: "analyst" };

        await httpRequest(port, { path: "/api/chat", method: "POST" }, body);

        const status = await waitForDone(port);

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

      const finalStatus = await httpRequest(port, { path: "/api/chat/status" });
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
        choices: [{ message: { content: `Response from ${modes[i % modes.length]}: turn ${i + 1}` } }],
      });
    }

    const chatRoutes = createMockLLMRouter(mockResponses);

    const app2 = express();
    app2.use(express.json());
    app2.use("/api/chat", chatRoutes);

    const server = app2.listen(0);
    const port = server.address().port;

    try {
      for (let i = 0; i < 10; i++) {
        const mode = modes[i % modes.length];
        await httpRequest(port, { path: "/api/chat", method: "POST" }, { message: `Turn ${i + 1}`, mode });

        const status = await waitForDone(port);
        const expectedCount = 1 + (i + 1) * 2;
        expect(status.messages.length).toBe(expectedCount);
        expect(status.messages[status.messages.length - 1].content).toBe(
          `Response from ${mode}: turn ${i + 1}`
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

    const chatRoutes = createMockLLMRouter(mockResponses);

    const app2 = express();
    app2.use(express.json());
    app2.use("/api/chat", chatRoutes);

    const server = app2.listen(0);
    const port = server.address().port;

    try {
      for (let i = 1; i <= 10; i++) {
        await httpRequest(port, { path: "/api/chat", method: "POST" }, {
          message: `Message ${i}`,
          mode: "analyst",
        });

        const status = await waitForDone(port);

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
  it("should return HTML containing 'Forgekeeper'", (done) => {
    const server = app.listen(0, () => {
      const port = server.address().port;

      const req = https.get(
        {
          hostname: "localhost",
          port: port,
          path: "/",
          rejectUnauthorized: false,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            server.close();
            expect(res.statusCode).toBe(200);
            expect(body).toContain("Forgekeeper");
            done();
          });
        }
      );

      req.on("error", (err) => {
        server.close();
        done(err);
      });
    });
  });

  it("should send the same file as the static middleware falls through to", (done) => {
    const server = app.listen(0, () => {
      const port = server.address().port;

      const filePath = path.join(__dirname, "..", "dist", "index.html");
      const expectedContent = fs.readFileSync(filePath, "utf-8");

      const req = https.get(
        {
          hostname: "localhost",
          port: port,
          path: "/",
          rejectUnauthorized: false,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            server.close();
            expect(body).toBe(expectedContent);
            done();
          });
        }
      );

      req.on("error", (err) => {
        server.close();
        done(err);
      });
    });
  });
});

describe("GET /api/chat/status", () => {
  it("should return JSON with messages array", (done) => {
    const server = app.listen(0, () => {
      const port = server.address().port;

      const req = https.get(
        {
          hostname: "localhost",
          port: port,
          path: "/api/chat/status",
          rejectUnauthorized: false,
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            server.close();
            expect(res.statusCode).toBe(200);
            const data = JSON.parse(body);
            expect(Array.isArray(data.messages)).toBe(true);
            expect(data).toHaveProperty("done");
            done();
          });
        }
      );

      req.on("error", (err) => {
        server.close();
        done(err);
      });
    });
  });
});

describe("GET /options", () => {
   it("should return JSON with modes array and currentMode", (done) => {
     const server = app.listen(0, () => {
       const port = server.address().port;

       const req = https.get(
         {
           hostname: "localhost",
           port: port,
           path: "/options",
           rejectUnauthorized: false,
         },
         (res) => {
           let body = "";
           res.on("data", (chunk) => (body += chunk));
           res.on("end", () => {
             server.close();
             expect(res.statusCode).toBe(200);
             const data = JSON.parse(body);
             expect(Array.isArray(data.modes)).toBe(true);
             expect(data.modes.length).toBeGreaterThan(0);
             expect(data).toHaveProperty("currentMode");
             expect(typeof data.currentMode).toBe("string");
             done();
           });
         }
       );

       req.on("error", (err) => {
         server.close();
         done(err);
       });
     });
   });

   it("should only include active workflow modes", (done) => {
     const server = app.listen(0, () => {
       const port = server.address().port;

       const req = https.get(
         {
           hostname: "localhost",
           port: port,
           path: "/options",
           rejectUnauthorized: false,
         },
         (res) => {
           let body = "";
           res.on("data", (chunk) => (body += chunk));
           res.on("end", () => {
             server.close();
             const data = JSON.parse(body);
             const modeIds = data.modes.map((m) => m.id);
             expect(modeIds).toContain("analyst");
             expect(modeIds).toContain("implementer");
             expect(modeIds).not.toContain("advisor");
             expect(modeIds).not.toContain("architect");
             expect(modeIds).not.toContain("reviewer");
             done();
           });
         }
       );

       req.on("error", (err) => {
         server.close();
         done(err);
       });
     });
   });

   it("should include id, label, and symbol for each mode", (done) => {
     const server = app.listen(0, () => {
       const port = server.address().port;

       const req = https.get(
         {
           hostname: "localhost",
           port: port,
           path: "/options",
           rejectUnauthorized: false,
         },
         (res) => {
           let body = "";
           res.on("data", (chunk) => (body += chunk));
           res.on("end", () => {
             server.close();
             const data = JSON.parse(body);
             for (const mode of data.modes) {
               expect(mode).toHaveProperty("id");
               expect(mode).toHaveProperty("label");
               expect(mode).toHaveProperty("symbol");
               expect(typeof mode.id).toBe("string");
               expect(typeof mode.label).toBe("string");
               expect(typeof mode.symbol).toBe("string");
             }
             done();
           });
         }
       );

       req.on("error", (err) => {
         server.close();
         done(err);
       });
     });
   });
 });
