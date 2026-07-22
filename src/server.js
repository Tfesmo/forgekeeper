import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";

import { chatRoutes } from "./routes/chatRoutes.js";
import { uiRoutes } from "./routes/uiRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const port = Number(process.env.PORT ?? 8888);
process.env.USE_HTTPS = process.env.USE_HTTPS || "1";

const app = express();

app.use(express.json());
app.use("/vue-assets", express.static(path.join(__dirname, "components", "vue")));

app.use("/api/chat", chatRoutes);
app.use("/", uiRoutes);

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
