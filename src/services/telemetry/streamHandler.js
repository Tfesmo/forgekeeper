import { createSseWriter } from '../../utils/sseWriter.js';

export function createStreamHandler(req, res, emitter) {
  const writer = createSseWriter(res);

  const progressHandler = (event) => {
    writer.sendEvent('progress', {
      server: event.server,
      fields: event.fields,
      timestamp: event.timestamp,
    });
  };

  const draftRateHandler = (event) => {
    writer.sendEvent('draft_rate', {
      server: event.server,
      fields: event.fields,
      timestamp: event.timestamp,
    });
  };

  emitter.on('progress', progressHandler);
  emitter.on('draft_rate', draftRateHandler);

  function sendEvent(eventType, data) {
    writer.sendEvent(eventType, data);
  }

  function onDisconnect() {
    emitter.off('progress', progressHandler);
    emitter.off('draft_rate', draftRateHandler);
    writer.end();
  }

  req.on('close', onDisconnect);

  return { sendEvent, endSession, writer, onDisconnect };
}
