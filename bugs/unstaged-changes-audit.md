# Unstaged Changes Audit Report

**Date:** 2026-07-23
**Scope:** All unstaged changes (`git diff`)
**Files affected:** 21 files (20 modified, 0 new, 0 deleted)

---

## Critical Bugs

### BUG-001: `src/utils/sseWriter.js:38` — `item.reject` is undefined on connection close

**Severity:** Critical — causes uncaught TypeError at runtime

**Description:**
The write queue stores objects with only `{ payload, resolve }`, but the `"close"` handler iterates the queue and calls `item.reject()`. Since `reject` was captured as `_reject` in the Promise constructor and never stored in the queue item, this throws `TypeError: item.reject is not a function` whenever the client disconnects or the connection closes.

```javascript
// Queue item only contains { payload, resolve } — no reject
writeQueue.push({ payload, resolve });

// This crashes because item.reject is undefined
res.on("close", () => {
  for (const item of writeQueue) {
    item.reject(new Error("SSE connection closed"));  // TypeError!
  }
});
```

**Reasoning:**
- The Promise constructor in `sendEvent()` captures `reject` as `_reject` (unused variable)
- Only `resolve` is pushed into the queue item
- When the connection closes, the cleanup handler tries to call `item.reject()` which does not exist
- This will crash the SSE writer and potentially leave the response in an undefined state

**Test to catch:**
```javascript
// src/utils/sseWriter.test.js
it("rejects pending writes on connection close", () => {
  const mockRes = {
    writeHead: vi.fn(),
    flushHeaders: vi.fn(),
    write: vi.fn(() => true),
    destroyed: false,
    writableEnded: false,
    on: vi.fn((event, cb) => {
      if (event === "close") {
        setTimeout(() => cb(), 10);
      }
    }),
  };
  const writer = createSseWriter(mockRes);
  const p = writer.sendEvent("test", { data: "hello" });
  // Trigger close — should reject the pending promise, not throw
  mockRes.on.mock.calls.find((c) => c[0] === "close")[1]();
  return expect(p).rejects.toThrow("SSE connection closed");
});
```

**Fix:**
Store `{ payload, resolve, reject }` in the queue and pass the actual reject to the Promise constructor.

---

**Status:** `[ ]`

---

## High Severity Bugs

### BUG-002: `src/server.js:59` — `readdirSync` on monitors dir unguarded — crashes if directory missing

**Severity:** High — server startup crashes if `monitors/` directory does not exist

**Description:**
The monitor auto-discovery code at the top level of `server.js` calls `readdirSync(monitorsDir)` without a try/catch. If the `monitors/` directory does not exist (which is likely in a clean checkout or deployment), `readdirSync` throws `ENOENT` and the entire server fails to start.

```javascript
const monitorsDir = path.join(__dirname, "monitors");
const monitors = [];
for (const file of readdirSync(monitorsDir)) {  // throws ENOENT if dir missing
  if (!file.endsWith(".js")) continue;
  const mod = await import(path.join(monitorsDir, file));
  ...
}
```

**Reasoning:**
- `fs.readdirSync()` throws if the directory does not exist
- No `fs.existsSync()` guard or try/catch around it
- This is at module top-level (synchronous execution before server starts)
- A clean install or deployment without monitors will fail

**Test to catch:**
```javascript
// src/server.test.js
it("starts successfully when monitors/ directory does not exist", async () => {
  // Mock or temporarily rename monitors dir
  // Server should not crash with ENOENT
});
```

**Fix:**
Wrap in `fs.existsSync()` guard or try/catch, and skip if directory is missing.

---

**Status:** `[ ]`

---

## Medium Severity Issues

### BUG-003: `src/server.js:23` — Unused import `stopMonitoring`

**Severity:** Low — dead code, but no runtime impact

**Description:**
`stopMonitoring` is imported from `logMonitor.js` but never called anywhere in `server.js`. This suggests the cleanup/shutdown logic was written but never wired up.

**Reasoning:**
- Import exists but no usage found in the file
- Indicates incomplete cleanup flow — the tail process likely runs indefinitely with no stop hook

**Test to catch:**
Static analysis (lint rule `no-unused-vars`) or grep for usage.

**Fix:**
Either remove the unused import or wire `stopMonitoring` into an `exit`/`SIGTERM` handler.

---

**Status:** `[ ]`

---

### BUG-004: `src/server.js:23-26` — Console.log on every request causes logging flood and performance degradation

**Severity:** Medium — degrades performance under load, floods logs

**Description:**
A global middleware logs every HTTP request:

```javascript
app.use((req, res, next) => {
  console.log("[HTTP]", req.method, req.url, "HTTP/" + (req.httpVersion || "?"));
  next();
});
```

This fires for every single request including static assets, health checks, and internal API calls.

**Reasoning:**
- `console.log` is synchronous I/O — it blocks the event loop
- Under load (hundreds of requests/sec), this creates significant overhead
- Logs will be flooded with repetitive requests for static assets and health endpoints
- No log level gating — this will fire in production too

**Test to catch:**
Load test the server and measure request latency with and without this middleware.

**Fix:**
- Gate behind a debug env variable (e.g., `DEBUG=*`)
- Or use a proper logging library with level control
- Or remove entirely in production builds

---

**Status:** `[ ]`

---

### BUG-005: `src/server.js:59-73` — Dynamic monitor discovery blocks server startup, no error isolation

**Severity:** Medium — any failing monitor import crashes the entire server

**Description:**
Monitor discovery runs at module top-level with dynamic `import()`:

```javascript
for (const file of readdirSync(monitorsDir)) {
  if (!file.endsWith(".js")) continue;
  const mod = await import(path.join(monitorsDir, file));  // dynamic ESM import
  if (typeof mod.start === "function") {
    monitors.push({ name: file.replace(".js", ""), start: mod.start, stop: mod.stop || (() => {}) });
  }
}
```

**Reasoning:**
- Dynamic `import()` is async but runs in a top-level `for` loop — this blocks the entire module
- If any monitor file has a syntax error, missing dependency, or circular import, the whole server crashes
- No error isolation — one bad monitor kills everything
- No graceful degradation

**Fix:**
- Wrap each `import()` in try/catch with per-monitor error logging
- Move discovery to a startup function called after the server is ready, not at module top-level
- Consider making monitors optional with clear error messages

---

**Status:** `[ ]`

---

### BUG-006: SSE stack — ~15 debug `console.log` statements scattered across hot path

**Severity:** Medium — production logging flood, no debug gating

**Description:**
Debug logging was added across three files in the SSE path:
- `src/server.js` — 4 console statements
- `src/services/telemetry/streamHandler.js` — 4 console statements
- `src/utils/sseWriter.js` — 7 console statements

**Reasoning:**
- All these run synchronously on every SSE event and connection lifecycle event
- In production, this will flood stdout/stderr
- No environment variable or log level gating
- Makes production troubleshooting harder by drowning real errors in debug output

**Fix:**
- Gate all debug logs behind a `DEBUG` environment variable check
- Or use a proper logger with configurable levels
- Or remove debug logs and keep only error logging

---

**Status:** `[ ]`

---

### BUG-007: `src/components/vue/mount.test.js` — Tests exercise trivial inline components, not real components

**Severity:** Medium — false sense of test coverage

**Description:**
The test suite mocks all stores and renders trivial inline Vue components that don't exercise any real component logic. The one test that imports the real `ChatView.vue` only checks that `ChatView.setup` is a function:

```javascript
it("defineEmits macro is available in real ChatView component", async () => {
  const { default: ChatView } = await import("./ChatView.vue");
  expect(ChatView).toBeDefined();
  expect(typeof ChatView).toBe("object");
  expect(ChatView.setup).toBeInstanceOf(Function);
});
```

**Reasoning:**
- Mocked components don't test actual component behavior
- No component rendering or event emission is tested for real components
- The real `ChatView.vue` has SSE connection, message sending, token tracking, etc. — none of which is tested
- Coverage is misleading — the tests pass but real component behavior is unverified

**Test to catch:**
```javascript
// src/components/vue/ChatView.test.js
it("emits 'tokens-updated' when llm-done fires with usage metrics", async () => {
  // Render real ChatView with mocked sessionStore, EventSource, etc.
  // Simulate llm-done event with usage metrics
  // Assert emit("tokens-updated", { used, total }) was called
  // Assert messages array was updated
});

it("closes telemetry EventSource on component unmount", async () => {
  // Render ChatView
  // Unmount component
  // Assert EventSource.close() was called
});

it("handles SSE error gracefully", async () => {
  // Simulate EventSource error
  // Assert error state is set and isLoading is false
});
```

**Fix:**
Replace inline mock components with tests that render real components (`App.vue`, `ChatView.vue`, `Header.vue`) using `@testing-library/vue` with mocked dependencies.

---

**Status:** `[ ]`

---

## Low Severity / Style Issues

### BUG-008: `src/components/vue/App.vue:37` — Hardcoded token total `64000`

**Severity:** Low — magic number, should be configurable

**Description:**
```javascript
const tokenStats = ref({ used: 0, total: 64000 });
```

The total token count is hardcoded. This should be sourced from a config, store, or passed as a prop.

**Fix:**
Read from `tokenUsageStore` or pass as a prop from a parent configuration.

---

**Status:** `[ ]`

---

### BUG-009: `src/components/vue/App.vue` — `telemetryData` ref never reset on SSE reconnect

**Severity:** Low — stale telemetry data persists across reconnects

**Description:**
When the EventSource reconnects (e.g., after network interruption), `telemetryData.value` retains old `progress` and `draft_rate` data. The SSE server may not resend these events on reconnect, leaving the UI with stale values.

**Fix:**
Clear `telemetryData.value = {}` after reconnection is established.

---

**Status:** `[ ]`

---

### BUG-010: `src/services/parserPipeline/pipeline.js:50-54` — Unnecessary multi-line object literal

**Severity:** Trivial — style preference only

**Description:**
```javascript
emitter.emit(eventType, {
  type: eventType,
  fields,
  timestamp: Date.now(),
  server: "ikllama",
});
```

A four-field object literal spread across six lines adds visual noise without improving readability.

**Fix:**
Flatten to a single line or use inline format consistent with the rest of the file.

---

**Status:** `[ ]`

---

### BUG-011: `src/components/vue/ChatView.vue:219` — Debug `console.log` in `connectToStream`

**Severity:** Low — debug logging in production code

**Description:**
```javascript
console.log("[EventSource] llm-done fired, isLoading:", isLoading.value, "hasActiveRequest:", hasActiveRequest.value);
console.log("[EventSource] onerror fired, isLoading:", isLoading.value, "hasActiveRequest:", hasActiveRequest.value);
console.log("[EventSource] onerror ignored — stream already completed");
```

Debug logs in the streaming path will fire on every LLM response in production.

**Fix:**
Gate behind debug environment variable or remove before merging.

---

**Status:** `[ ]`

---

## Summary

| Severity | Count | Bugs |
|----------|-------|------|
| Critical | 1 | BUG-001 |
| High | 1 | BUG-002 |
| Medium | 4 | BUG-003, BUG-004, BUG-005, BUG-006, BUG-007 |
| Low | 3 | BUG-008, BUG-009, BUG-010, BUG-011 |
| Trivial | 1 | BUG-010 |

**Total:** 11 items across 8 files

**Priority actions:**
1. Fix BUG-001 immediately (runtime crash on any SSE disconnect)
2. Fix BUG-002 immediately (server crash on missing monitors dir)
3. Gate debug logs (BUG-004, BUG-006, BUG-011) behind env var before merge
4. Replace mock tests with real component tests (BUG-007)
