export function createSseWriter(res) {
  let seq = 0;
  let writeQueue = [];
  let processing = false;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('event: connected\ndata: {"type":"connected"}\n\n');

  function processQueue() {
    if (processing || res.destroyed || res.writableEnded) return;
    processing = true;

    while (writeQueue.length > 0) {
      const { payload, resolve } = writeQueue.shift();
      const ok = res.write(payload);
      if (!ok) {
        processing = false;
        return;
      }
      resolve();
    }
    processing = false;
  }

  function sendEvent(eventType, data) {
    if (res.destroyed || res.writableEnded) {
      return Promise.reject(new Error('SSE connection closed'));
    }
    seq++;
    const payload = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq })}\n\n`;
    return new Promise((resolve, reject) => {
      writeQueue.push({ payload, resolve });
      processQueue();
    });
  }

  res.on('close', () => {
    for (const item of writeQueue) {
      item.reject(new Error('SSE connection closed'));
    }
    writeQueue = [];
    processing = false;
  });

  res.on('drain', () => {
    processQueue();
  });

  function close() {
    if (!res.writableEnded) res.end();
  }

  return { sendEvent, close };
}
