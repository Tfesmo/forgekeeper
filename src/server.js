import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { serverApiRouter } from "./routes/serverApiRoutes.js";
import { sessionRoutes } from "./routes/sessionRoutes.js";
import { uiRoutes } from "./routes/uiRoutes.js";
import { loadConfig } from "./services/parserPipeline/config.js";
import { createPipeline } from "./services/parserPipeline/pipeline.js";
import { tailLogFile, stopMonitoring } from "./services/logMonitor.js";
import { setEmitter, getEmitter } from "./services/telemetry/telemetryEmitter.js";
import { createSseConnection } from "./services/telemetry/streamHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT ?? 8888);
process.env.USE_HTTPS = process.env.USE_HTTPS || "1";

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use("/vue-assets", express.static(path.join(__dirname, "components", "vue")));

app.use("/api/session", sessionRoutes);
app.use("/api/server", serverApiRouter);

// Permanent SSE for telemetry (before uiRoutes catch-all serveStatic)
app.get('/api/stream', (req, res) => {
  createSseConnection(res, getEmitter());
});

app.use("/", uiRoutes);

const config = loadConfig();
const pipeline = createPipeline(config);
setEmitter(pipeline.emitter);
if (pipeline.start) {
  pipeline.start('ikllama');
}
tailLogFile(pipeline, config.log_path);

function startServer(protocol) {
  const server = protocol
    ? https
        .createServer(
          {
            key: fs.readFileSync(path.join(__dirname, "..", "certs", "key.pem")),
            cert: fs.readFileSync(path.join(__dirname, "..", "certs", "cert.pem")),
          },
          app,
        )
        .listen(port, "0.0.0.0", () => {
          console.log(`Listening on https://0.0.0.0:${port}`);
        })
    : app.listen(port, "0.0.0.0", () => {
        console.log(`Listening on http://0.0.0.0:${port}`);
      });

  return server;
}

const server = startServer(process.env.USE_HTTPS);
if (!server) {
  console.error("Failed to start server — check certs/cert.pem and certs/key.pem");
}

process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  stopMonitoring();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  stopMonitoring();
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => {
    process.exit(1);
  }, 10000);
});
