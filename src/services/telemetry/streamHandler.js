import { createSseWriter } from '../../utils/sseWriter.js';

const EVENT_HANDLERS = {
  progress: (writer) => (event) => {
    writer.sendEvent('progress', {
      server: event.server,
      fields: event.fields,
      timestamp: event.timestamp,
    });
  },
  draft_rate: (writer) => (event) => {
    writer.sendEvent('draft_rate', {
      server: event.server,
      fields: event.fields,
      timestamp: event.timestamp,
    });
  },
};

export function createSseConnection(res) {
  const writer = createSseWriter(res);
  return { sendEvent: writer.sendEvent, close: writer.close };
}

export function createTelemetryStream(req, res, emitter) {
  const writer = createSseWriter(res);

  const subscriptions = [];
  const handlers = {};

  function subscribe(eventType) {
    const factory = EVENT_HANDLERS[eventType];
    if (!factory) return;
    handlers[eventType] = factory(writer);
    emitter.on(eventType, handlers[eventType]);
    subscriptions.push(eventType);
  }

  subscribe('progress');
  subscribe('draft_rate');

  function sendEvent(eventType, data) {
    writer.sendEvent(eventType, data);
  }

  function onDisconnect() {
    for (const eventType of subscriptions) {
      if (handlers[eventType]) {
        emitter.off(eventType, handlers[eventType]);
      }
    }
    writer.close();
  }

  req.on('close', onDisconnect);

  return { sendEvent, close: writer.close, onDisconnect };
}
