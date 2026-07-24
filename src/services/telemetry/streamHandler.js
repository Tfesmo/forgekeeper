import { createSseWriter } from "../../utils/sseWriter.js";
import { getEmitter } from "./telemetryEmitter.js";

const EVENT_MAP = {
  progress: { type: "progress", keys: ["server", "fields", "timestamp"] },
  draft_rate: { type: "draft_rate", keys: ["server", "fields", "timestamp"] },
  memory: { type: "memory", keys: ["rss", "timestamp"] },
};

export function createSseConnection(res, emitter) {
  const writer = createSseWriter(res);
  const subEmitter = emitter || getEmitter();
  console.log("[SSE] SubEmitter:", subEmitter ? "set" : "null", "subscribing to:", Object.keys(EVENT_MAP));

  const subscriptions = [];
  const handlers = {};

  function subscribe(eventType) {
    const config = EVENT_MAP[eventType];
    if (!config) return;
    handlers[eventType] = async (event) => {
      try {
        const filtered = {};
        for (const key of config.keys) {
          if (event[key] !== undefined) filtered[key] = event[key];
        }
        await writer.sendEvent(config.type, filtered);
      } catch (err) {
        console.error(`[SSE] Error sending ${config.type}:`, err.message);
      }
    };
    console.log("[SSE] Subscribing to", eventType);
    subEmitter.on(eventType, handlers[eventType]);
    subscriptions.push(eventType);
  }

  subscribe("progress");
  subscribe("draft_rate");
  subscribe("memory");

  res.on("close", () => {
    console.log("[SSE] res close event — cleaning up subscriptions");
    for (const eventType of subscriptions) {
      if (handlers[eventType]) {
        subEmitter.off(eventType, handlers[eventType]);
      }
    }
    writer.close();
  });

  res.on("error", (err) => {
    console.error("[SSE] res error event:", err.message);
  });

  function sendEvent(eventType, data) {
    writer.sendEvent(eventType, data);
  }

  return { sendEvent: writer.sendEvent, sendEventRaw: sendEvent, close: writer.close };
}
