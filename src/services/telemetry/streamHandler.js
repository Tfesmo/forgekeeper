import { createSseWriter } from '../../utils/sseWriter.js';
import { getEmitter } from './telemetryEmitter.js';

const EVENT_MAP = {
  progress: { type: 'progress', keys: ['server', 'fields', 'timestamp'] },
  draft_rate: { type: 'draft_rate', keys: ['server', 'fields', 'timestamp'] },
};

export function createSseConnection(res, emitter) {
  const writer = createSseWriter(res);
  const subEmitter = emitter || getEmitter();
  const subscriptions = [];
  const handlers = {};

  function subscribe(eventType) {
    const config = EVENT_MAP[eventType];
    if (!config) return;
    handlers[eventType] = async (event) => {
      const filtered = {};
      for (const key of config.keys) {
        if (event[key] !== undefined) filtered[key] = event[key];
      }
      await writer.sendEvent(config.type, filtered);
    };
    subEmitter.on(eventType, handlers[eventType]);
    subscriptions.push(eventType);
  }

  subscribe('progress');
  subscribe('draft_rate');

  res.on('close', () => {
    for (const eventType of subscriptions) {
      if (handlers[eventType]) {
        subEmitter.off(eventType, handlers[eventType]);
      }
    }
    writer.close();
  });

  function sendEvent(eventType, data) {
    writer.sendEvent(eventType, data);
  }

  return { sendEvent: writer.sendEvent, sendEventRaw: sendEvent, close: writer.close };
}
