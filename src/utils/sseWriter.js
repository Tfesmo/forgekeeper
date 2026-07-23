export function createSseWriter(res) {
  let seq = 0;
  let drainResolver = null;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  res.write('event: connected\ndata: {"type":"connected"}\n\n');

  function sendEvent(eventType, data) {
    if (res.destroyed || res.writableEnded) {
      return;
    }
    seq++;
    const payload = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq })}\n\n`;
    const ok = res.write(payload);

    if (!ok) {
      return new Promise(resolve => {
        drainResolver = resolve;
      });
    }
    return Promise.resolve();
  }

  res.on('close', () => {
    if (drainResolver) drainResolver();
    drainResolver = null;
  });

  res.on('drain', () => {
    if (drainResolver) drainResolver();
  });

  function close() {
    if (!res.writableEnded) {
      res.end();
    }
  }

  return { sendEvent, close };
}
