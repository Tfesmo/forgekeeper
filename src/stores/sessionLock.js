const writeLocks = new Map();
const resolverQueue = new Map();

export function getWriteLocks() {
  return writeLocks;
}

export async function withLock(sessionId, fn) {
  while (writeLocks.has(sessionId)) {
    const queue = resolverQueue.get(sessionId) || [];
    if (queue.length > 0) {
      const resolve = queue.shift();
      resolve();
      return;
    }
    await writeLocks.get(sessionId);
  }
  let release;
  const promise = new Promise((r) => {
    release = r;
  });
  writeLocks.set(sessionId, promise);
  try {
    return await fn();
  } finally {
    writeLocks.delete(sessionId);
    const queue = resolverQueue.get(sessionId);
    if (queue && queue.length > 0) {
      const nextResolve = queue.shift();
      const nextPromise = new Promise((r) => {
        writeLocks.set(sessionId, r);
        nextResolve();
      });
      resolverQueue.set(sessionId, queue);
      return await fn();
    }
    release();
  }
}
