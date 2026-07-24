import { debug } from "./debug.js";

export function createSseWriter(res) {
  let seq = 0;
  let writeQueue = [];
  let processing = false;

  try {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.flushHeaders();
    const connected = res.write('event: connected\ndata: {"type":"connected"}\n\n');
    debug.sse("Headers sent, connected write: %s", connected);
  } catch (err) {
    console.error("[SSE] writeHead failed:", err.message);
    throw err;
  }

  function processQueue() {
    if (processing || res.destroyed || res.writableEnded) return;
    processing = true;

    while (writeQueue.length > 0) {
      const { payload, resolve } = writeQueue.shift();
      try {
        const ok = res.write(payload);
        if (!ok) {
          processing = false;
          return;
        }
        resolve();
      } catch (err) {
        console.error("[SSE] write error:", err.message);
        resolve();
      }
    }
    processing = false;
  }

  function sendEvent(eventType, data) {
    if (res.destroyed || res.writableEnded) {
      debug.sse("sendEvent skipped — connection closed");
      return Promise.reject(new Error("SSE connection closed"));
    }
    seq++;
    const payload = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq })}\n\n`;
    return new Promise((resolve, reject) => {
      writeQueue.push({ payload, resolve, reject });
      processQueue();
    });
  }

  res.on("close", () => {
    debug.sse("writer close — rejecting %d pending writes", writeQueue.length);
    for (const item of writeQueue) {
      item.reject(new Error("SSE connection closed"));
    }
    writeQueue = [];
    processing = false;
  });

  res.on("error", (err) => {
    console.error("[SSE] writer error event:", err.message);
  });

  res.on("drain", () => {
    processQueue();
  });

  function close() {
    if (!res.writableEnded) res.end();
  }

  return { sendEvent, close };
}
