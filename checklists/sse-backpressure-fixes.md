# SSE Backpressure Fix — Two Approaches

## Problem

`sendEvent()` in `sseWriter.js` returns a Promise when `res.write()` returns `false` (backpressure), but callers don't await it. This means:

1. Multiple backpressure Promises pile up, each overwriting `drainResolver`
2. The last Promise resolves on 'drain', earlier ones leak forever
3. Under heavy load, chunks silently drop (invalidating client caching, risking missed tool calls)

## Current State

- `sseWriter.js` has basic backpressure handling but no queueing and no `pending` guard
- No caller awaits `sendEvent()` — not in `llmService.js`, `sessionRoutes.js`, or `streamHandler.js`
- This works "fine" under normal conditions (client can keep up), but breaks under slow clients or high throughput

---

## Option A: Queue-based writes (robust)

Replace the single-resolver approach with an internal write queue. All writes go through a serial processor, guaranteeing order and zero data loss even if callers forget to await.

### Files to change

#### 1. `src/utils/sseWriter.js`

```js
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
```

Key changes:
- `writeQueue` array holds pending writes with their resolve/reject callbacks
- `processQueue()` drains the queue one item at a time, respecting backpressure
- 'close' rejects all queued items
- 'drain' triggers re-processing

#### 2. `src/services/llmService.js:121, 130`

```js
// Before:
onChunk(choice.delta.content, "content");
onChunk(choice.delta.reasoning_content, "reasoning");

// After:
await onChunk(choice.delta.content, "content");
await onChunk(choice.delta.reasoning_content, "reasoning");
```

This ensures the LLM streaming loop blocks on backpressure, naturally throttling the fetch reader.

#### 3. `src/services/telemetry/streamHandler.js:23`

```js
// Before:
writer.sendEvent(config.type, filtered);

// After:
await writer.sendEvent(config.type, filtered);
```

#### 4. `src/routes/sessionRoutes.js:85, 90, 94, 96`

```js
// Before:
stream.sendEvent(eventType, { content: chunk });
stream.sendEvent("llm-done", { message: lastMsg, done: true });
stream.sendEvent("llm-done", { done: true, aborted: true });
stream.sendEvent("llm-error", { error: err.message, done: true });

// After:
await stream.sendEvent(eventType, { content: chunk });
await stream.sendEvent("llm-done", { message: lastMsg, done: true });
await stream.sendEvent("llm-done", { done: true, aborted: true });
await stream.sendEvent("llm-error", { error: err.message, done: true });
```

### Tradeoffs

- **Pro:** Zero data loss, works even if future callers forget to await
- **Pro:** Natural backpressure propagation — LLM stream slows down when client is slow
- **Con:** More complex implementation
- **Con:** Requires adding `await` in multiple callers

---

## Option B: Simple awaiting + defensive comments (fragile but simple)

Keep the current `sendEvent` implementation but add `await` at all call sites. This prevents multiple backpressure Promises from stacking up, so the drain resolver can't be overwritten.

### Files to change

#### 1. `src/utils/sseWriter.js` — no changes

#### 2. `src/services/llmService.js:121, 130`

```js
await onChunk(choice.delta.content, "content");
await onChunk(choice.delta.reasoning_content, "reasoning");
```

Add a defensive comment at the top of `callLLMStreaming`:

```js
/**
 * NOTE: The onChunk callback must be awaited to prevent backpressure
 * from being bypassed. If not awaited, multiple sendEvent() calls can
 * overwrite the drainResolver, causing earlier writes to leak.
 * See: checklists/sse-backpressure-fixes.md (Option B)
 */
```

#### 3. `src/services/telemetry/streamHandler.js:23`

```js
await writer.sendEvent(config.type, filtered);
```

#### 4. `src/routes/sessionRoutes.js:85, 90, 94, 96`

```js
await stream.sendEvent(eventType, { content: chunk });
await stream.sendEvent("llm-done", { message: lastMsg, done: true });
await stream.sendEvent("llm-done", { done: true, aborted: true });
await stream.sendEvent("llm-error", { error: err.message, done: true });
```

Add defensive comment:

```js
/**
 * NOTE: All sendEvent() calls here are awaited to prevent backpressure
 * from causing lost chunks or leaking Promise rejections. If a future
 * developer removes await, the drainResolver can be overwritten by
 * concurrent backpressure writes. See:
 * checklists/sse-backpressure-fixes.md (Option B)
 */
```

### Tradeoffs

- **Pro:** Minimal code changes, easy to review
- **Pro:** The current `sendEvent` implementation already handles backpressure correctly when awaited
- **Con:** Fragile — any future caller that forgets to await will cause silent data loss
- **Con:** Defensive comments can be ignored or considered "dead" documentation

---

## Decision

Starting with Option A. If it introduces regressions or complexity issues, we'll fall back to Option B + defensive comments.
