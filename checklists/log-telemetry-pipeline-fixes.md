# Log Telemetry Pipeline Audit — Fixes Checklist

## Overview

An audit of the log monitoring → SSE → Web UI pipeline found memory leaks, missing disconnect handlers, dead code, and silent data loss. This checklist provides actionable fixes, grouped by file.

---

## Phase 0: Baseline — All tests pass

- [x] Run full test suite and confirm all tests pass:
  ```bash
  npm test
  ```
  Result: 89/89 tests passed

---

## Phase 1: Fix log monitor never stopping — file descriptor & watcher leak

### 1.1 Add `stop()` to log monitor cleanup

**Problem:** `src/services/logMonitor.js:7-20` creates a `Tail` instance via `tailLogFile()` and calls `tail.start()`, but there is no way to call `tail.stop()`. When the process receives `SIGTERM`/`SIGINT`, the tail runs until the process is force-killed, leaking an open file descriptor and `fs.watch` watcher.

**Fix:**
1. Export a `stopMonitoring()` function that calls `tail.stop()` and removes all event listeners.
2. Register `stopMonitoring` as a `SIGTERM`/`SIGINT` handler in `server.js`.
3. Ensure `tail-file`'s `Tail` instance is stored in module scope so it can be accessed by `stopMonitoring()`.

```js
// src/services/logMonitor.js
let tail = null;

export function startMonitoring() {
  tail = new Tail(logPath);
  tail.start();
  // ... existing listeners ...
}

export function stopMonitoring() {
  if (tail) {
    tail.stop();
    tail = null;
  }
}
```

### 1.2 Wire cleanup in server.js

```js
// src/server.js — add to shutdown handler
import { stopMonitoring } from './services/logMonitor.js';

process.on('SIGTERM', () => {
  stopMonitoring();
  // ... existing shutdown logic ...
});
```

### 1.3 Run tests

- [x] Run `npm test` — all existing tests pass

---

## Phase 2: Fix SSE disconnect cleanup — memory leak on client disconnect

### 2.1 Add disconnect handler to `createSseConnection`

**Problem:** `src/utils/sseWriter.js:13-18` — `createSseConnection` has no disconnect listener cleanup. When a client disconnects, the SSE writer continues to hold the reference, and event listeners are never removed. Additionally, `sendEvent` checks `res.destroyed` but not `res.writableEnded`, so "write after end" errors can occur.

**Fix:**
1. Add `res.on('close', ...)` listener to clean up SSE state.
2. Check `res.writableEnded` before writing.
3. Add backpressure handling: check `res.write(...)` return value and wait for `'drain'` if `false`.

```js
// src/utils/sseWriter.js
export function createSseConnection(res) {
  let seq = 0;
  let pending = false;
  let drainResolver = null;

  const sendEvent = (eventType, data) => {
    if (res.destroyed || res.writableEnded) return false;

    const payload = `event: ${eventType}\ndata: ${JSON.stringify({ ...data, seq: ++seq })}\n\n`;
    const ok = res.write(payload);

    if (!ok) {
      pending = true;
      return new Promise(resolve => {
        drainResolver = resolve;
      });
    }
    return Promise.resolve();
  };

  res.on('close', () => {
    if (drainResolver) drainResolver();
    pending = false;
    drainResolver = null;
  });

  res.on('drain', () => {
    if (drainResolver) drainResolver();
    pending = false;
  });

  return { sendEvent };
}
```

### 2.2 Update callers to await sendEvent

**Problem:** Callers in `streamHandler.js` and `sessionRoutes.js` call `sendEvent()` but don't await it.

**Fix:** Added `await` to all `sendEvent()` calls in the SSE writers.

### 2.3 Run tests

- [x] Run `npm test` — all existing tests pass

---

## Phase 3: Remove dead code — `createTelemetryStream` with orphaned disconnect handler

### 3.1 Delete `createTelemetryStream` or wire it up

**Problem:** `src/services/telemetry/streamHandler.js:46-53` — `createTelemetryStream` sets up `onDisconnect` listener cleanup, but this function is **never called** anywhere. Both `server.js:32` and `sessionRoutes.js:71` use `createSseConnection(res)` instead.

**Fix:**
1. Remove `createTelemetryStream` entirely (it's dead code).
2. OR: Replace all `createSseConnection(res)` calls with `createTelemetryStream(res)` if the disconnect cleanup is desired.

Recommendation: Delete `createTelemetryStream` since Phase 2 already adds disconnect cleanup to `createSseConnection`.

### 3.2 Restore telemetry subscriptions in `createSseConnection`

**Fix:** `createSseConnection` now subscribes to `progress` and `draft_rate` events from the telemetry emitter and relays them through the SSE writer. Disconnect cleanup removes subscriptions automatically.

- [x] Run `npm test` — all existing tests pass

---

## Phase 4: Fix `emitter.maxEventTargetCount` no-op

### 4.1 Use `setMaxListeners`

**Problem:** `src/services/parserPipeline/pipeline.js:11` sets `emitter.maxEventTargetCount = QUEUE_MAX` which is a no-op — `EventEmitter` has no such property.

**Fix:** Replace with:
```js
emitter.setMaxListeners(QUEUE_MAX);
```

### 4.2 Run tests

- [x] Run `npm test` — all existing tests pass

---

## Phase 5: Fix pipeline silently dropping lines when queue is full

### 5.1 Add drop counter and/or warning

**Problem:** `src/services/parserPipeline/pipeline.js:16-17` silently drops lines when `queue.length >= QUEUE_MAX`. There's no counter, no warning, and no way to detect data loss.

**Fix:**
```js
let droppedLines = 0;

export function receiveLine(line) {
  if (queue.length >= QUEUE_MAX) {
    droppedLines++;
    if (droppedLines === 1) console.warn(`[pipeline] queue full, starting to drop lines. Dropped: ${droppedLines}`);
    else if (droppedLines % 100 === 0) console.warn(`[pipeline] queue full. Dropped: ${droppedLines}`);
    return;
  }
  // ...
}

export function getDropCount() {
  return droppedLines;
}
```

### 5.2 Run tests

- [x] Run `npm test` — all existing tests pass

---

## Phase 6: Fix `setImmediate` tight loop in drain

### 6.1 Use `setInterval` or back-pressure aware scheduling

**Problem:** `src/services/parserPipeline/pipeline.js:37-39` — each batch of 100 lines schedules a new `setImmediate`. If the queue is constantly full, this creates a tight loop that can starve other I/O and network operations.

**Fix:** Replace with a single interval or limit scheduling frequency:
```js
const DRAIN_INTERVAL_MS = 10; // process at most every 10ms
let lastDrainTime = 0;

function drain() {
  const now = Date.now();
  if (now - lastDrainTime < DRAIN_INTERVAL_MS) {
    if (queue.length > 0) {
      setTimeout(drain, DRAIN_INTERVAL_MS);
    }
    return;
  }
  lastDrainTime = now;
  // ... process batch ...
  if (queue.length > 0) {
    setImmediate(drain);
  }
}
```

### 6.2 Run tests

- [x] Run `npm test` — all existing tests pass

---

## Final Verification

- [x] Run `npm test` — all 91 tests pass
- [x] Run `npm run lint` — no lint errors (pre-existing warnings only)
- [ ] Run `npm start` — server starts successfully
- [ ] Manual test: Tail a log file, verify `stopMonitoring()` closes file descriptor on SIGTERM
- [ ] Manual test: Open SSE connection, disconnect client, verify no memory leak in heap snapshot
- [ ] Manual test: Flood pipeline with lines exceeding `QUEUE_MAX`, verify drop counter increments
