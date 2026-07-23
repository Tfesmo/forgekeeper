export function createSseWriter(res) {
  let seq = 0;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();

  res.write('event: connected\ndata: {"type":"connected"}\n\n');

  function sendEvent(eventType, data) {
    if (res.destroyed) {
      return;
    }
    seq++;
    res.write(`event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq })}\n\n`);
  }

  function close() {
    if (!res.writableEnded) {
      res.end();
    }
  }

  return { sendEvent, close };
}
