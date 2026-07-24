import { debug } from "../utils/debug.js";
import { createSseConnection } from "../services/telemetry/streamHandler.js";
import { getEmitter } from "../services/telemetry/telemetryEmitter.js";

export function setupSseRoutes(app) {
  app.get("/api/stream", (req, res) => {
    debug.sse("Connection attempt from %s", req.ip);
    try {
      createSseConnection(res, getEmitter());
      debug.sse("Connected");
      res.on("error", (err) => {
        console.error("[SSE] Connection error:", err.message);
      });
      res.on("close", () => {
        debug.sse("Client disconnected");
      });
    } catch (err) {
      console.error("[SSE] Failed to create connection:", err.message);
      console.error(err.stack);
    }
  });
}
