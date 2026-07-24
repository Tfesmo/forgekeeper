let intervalId = null;

export function start(intervalMs, emitter) {
  intervalId = setInterval(() => {
    const rss = process.memoryUsage().rss;
    emitter.emit("memory", { rss, timestamp: Date.now() });
  }, intervalMs);
}

export function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
