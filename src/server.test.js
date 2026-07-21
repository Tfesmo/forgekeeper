import { describe, it, expect } from "vitest";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { chatRoutes } from "./routes/chatRoutes.js";
import { uiRoutes } from "./routes/uiRoutes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());
app.use("/vue-assets", express.static(path.join(__dirname, "components", "vue")));
app.use("/api/chat", chatRoutes);
app.use("/", uiRoutes);

describe("GET /", () => {
  it("should return HTML containing 'Forgekeeper'", (done) => {
    const server = app.listen(0, () => {
      const port = server.address().port;
      const url = `https://localhost:${port}/`;

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

      // Direct file read for comparison
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
