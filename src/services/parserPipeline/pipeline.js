import { EventEmitter } from 'events';
import { registerParsers } from './parsers/index.js';

const QUEUE_MAX = 10000;
const QUEUE_BATCH = 100;

export function createPipeline(config) {
  const parserRegistry = new Map();
  registerParsers(parserRegistry, config.parsers || {}, config.events || []);
  const emitter = new EventEmitter();
  emitter.maxEventTargetCount = QUEUE_MAX;
  let isStarted = false;
  let queue = [];
  let draining = false;

  function receiveLine(rawLine) {
    if (queue.length >= QUEUE_MAX) return;
    queue.push(rawLine);
    if (!draining) {
      draining = true;
      setImmediate(drain);
    }
  }

  function drain() {
    let processed = 0;
    while (queue.length > 0 && processed < QUEUE_BATCH) {
      const line = queue.shift();
      for (const [eventType, parser] of parserRegistry) {
        const fields = parser.parse(line);
        if (fields) {
          emitter.emit(eventType, { type: eventType, fields, timestamp: Date.now(), server: 'ikllama' });
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

  return { receiveLine, start, emitter, isStarted: () => isStarted };
}
