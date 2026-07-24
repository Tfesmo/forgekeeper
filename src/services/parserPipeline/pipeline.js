import { EventEmitter } from "events";

import { registerParsers } from "./parsers/index.js";

const QUEUE_MAX = 10000;
const QUEUE_BATCH = 100;
const DRAIN_INTERVAL_MS = 10;

export function createPipeline(config) {
  const parserRegistry = new Map();
  registerParsers(parserRegistry, config.parsers || {}, config.events || []);
  const emitter = new EventEmitter();
  emitter.setMaxListeners(QUEUE_MAX);
  let isStarted = false;
  let queue = [];
  let draining = false;
  let droppedLines = 0;
  let lastDrainTime = 0;

  function receiveLine(rawLine) {
    if (queue.length >= QUEUE_MAX) {
      droppedLines++;
      if (droppedLines === 1)
        console.warn(`[pipeline] queue full, starting to drop lines. Dropped: ${droppedLines}`);
      else if (droppedLines % 100 === 0)
        console.warn(`[pipeline] queue full. Dropped: ${droppedLines}`);
      return;
    }
    queue.push(rawLine);
    if (!draining) {
      draining = true;
      setImmediate(drain);
    }
  }

  function drain() {
    const now = Date.now();
    if (now - lastDrainTime < DRAIN_INTERVAL_MS) {
      if (queue.length > 0) {
        setTimeout(drain, DRAIN_INTERVAL_MS);
      }
      return;
    }
    lastDrainTime = now;
    let processed = 0;
    while (queue.length > 0 && processed < QUEUE_BATCH) {
      const line = queue.shift();
      for (const [eventType, parser] of parserRegistry) {
        const fields = parser.parse(line);
        if (fields) {
          emitter.emit(eventType, {
            type: eventType,
            fields,
            timestamp: Date.now(),
            server: "ikllama",
          });
        }
      }
      processed++;
    }
    if (queue.length > 0) {
      setImmediate(drain);
    } else {
      draining = false;
    }
  }

  function start(serverName) {
    if (isStarted) return;
    isStarted = true;
  }

  return {
    receiveLine,
    start,
    emitter,
    isStarted: () => isStarted,
    getDropCount: () => droppedLines,
  };
}
