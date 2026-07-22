# SSE Streaming + Per-File Session Persistence Implementation

## Overview

Replace polling architecture with SSE streaming, and replace in-memory conversation store with per-file session storage. This is a large refactor with multiple interdependent phases.

---

## Phase 0: Dependencies & Setup

- [x] Add `uuid` to `package.json` (`npm install uuid`)
- [x] Add `.forgekeeper/sessions/` directory (gitignored)
- [x] Verify `src/stores/conversationStore.js` tests are not blocking

---

## Phase 1: Session Store (`src/stores/sessionStore.js`)

- [x] Create `.forgekeeper/sessions/` directory (create on first session)
- [x] Implement `createSession(mode)` → returns `{ id, session }`, creates file
- [x] Implement `getSession(sessionId)` → loads from file + in-memory cache
- [x] Implement `updateSession(sessionId, data)` → writes to file + updates cache
- [x] Implement `deleteSession(sessionId)` → removes file + cache entry
- [x] Implement `getActiveSessionId()` → returns first session with active `abortController`
- [x] In-memory `Map<sessionId, session>` cache with file sync on mutation
- [x] Delete `src/stores/conversationStore.js`
- [x] Update all imports referencing `conversationStore.js` → `sessionStore.js`

---

## Phase 2: LLM Streaming Service (`src/services/llmService.js`)

- [x] Add `callLLMStreaming(session, signal, onChunk)` returning `Promise<void>`
- [x] Fetch llama.cpp with `stream: true` parameter
- [x] Parse SSE chunks from response body (`data: {...}\n\n`)
- [x] Accumulate content + reasoning_content while calling `onChunk(chunk)`
- [x] Capture `usage` and `timings` from final chunk
- [x] On completion: push assistant message with content, reasoning_content, metrics
- [x] On abort: mark session as done, throw error
- [x] On error: mark session with error, throw error

---

## Phase 3: Chat Routes (`src/routes/chatRoutes.js`)

- [x] Replace `SESSION_ID = "default"` with session store imports
- [x] Add `POST /api/chat/sessions/new` convenience endpoint
- [x] Add `GET /api/chat/sessions` list endpoint
- [x] Update `POST /api/chat` to:
  - [x] Accept `sessionId` from request body
  - [x] Check for active `abortController` → return 409 if active
  - [x] Keep fire-and-forget non-streaming behavior
- [x] Add `POST /api/chat/stream` SSE endpoint:
  - [x] Accept `sessionId` from request body
  - [x] Check session exists (404 if not)
  - [x] Check no active request (409 if streaming)
  - [x] Set SSE headers (`text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive`)
  - [x] Call `callLLMStreaming()` with `onChunk` callback
  - [x] Write SSE events: `data: {"type":"content","content":"..."}\n\n`
  - [x] Write `done` event on completion
  - [x] Write `error` event on failure
  - [x] Handle abort on session cancellation
- [x] Update `POST /api/chat/abort` to accept `sessionId` from request body
- [x] Update `GET /api/chat/status` to accept `sessionId` query param

---

## Phase 4: Frontend (`src/components/vue/ChatView.vue`)

- [x] Replace `setInterval` polling with `EventSource`
- [x] Generate session UUID via `POST /api/chat/sessions/new` before first message
- [x] `sendMessage()` flow:
  - [x] POST `/api/chat` with `{ sessionId, message, mode }`
  - [x] Connect `EventSource` to `/api/chat/stream?sessionId=...`
  - [x] Handle `message` event → parse JSON → append chunks
  - [x] Handle `done` → stop loading state, close EventSource
  - [x] Handle `error` → display error, close EventSource
- [x] Implement `appendChunk(chunk, type)` → accumulate on current assistant message
- [x] On mount: load existing session from `/api/chat/status?sessionId=...`
- [x] On unmount: close EventSource

---

## Phase 5: Server Setup (`src/server.js`)

- [x] Verify routes mount correctly (`chatRoutes` covers all `/api/chat/*` paths)

---

## Phase 6: Cleanup

- [x] User OKs changes
- [ ] Remove dead code (POST /api/chat endpoint, EventSource references, old polling logic)
- [ ] Update documentation

---

## Phase 7: Two-Step SSE Architecture (Option B)

See `checklists/sse-two-step.md` for detailed steps.

- [x] Refactor to POST-accept + GET-stream pattern
- [x] Use `res.writeHead()` with initial connected event
- [x] Distinct event types: `llm-chunk`, `llm-reasoning`, `llm-done`, `llm-error`
- [x] Frontend uses `EventSource` with `addEventListener`
- [x] All 46 tests still passing

---

## Test Checkpoints

| Checkpoint | What to verify | When |
|------------|---------------|------|
| T1 | `sessionStore.js` unit tests pass | After Phase 1 |
| T2 | `llmService.test.js` still passes (non-streaming `callLLM` unchanged) | After Phase 2 |
| T3 | `POST /api/chat` returns 409 on concurrent request | After Phase 3 |
| T4 | `GET /api/chat/stream/llm` streams chunks to EventSource | After Phase 3 + Phase 4 |
| T5 | Frontend displays streaming response in UI | After Phase 4 |
| T6 | Session file exists at `.forgekeeper/sessions/<uuid>.json` after request | After Phase 1 + Phase 3 |

---

## Notes

- **Per-session blocking**: Each session tracks its own `abortController`. Session A streaming does not block Session B.
- **Session creation**: Server generates UUIDs to guarantee uniqueness.
- **Combined stream**: Content and reasoning chunks are combined into one SSE stream. Event types distinguish content vs. reasoning.
- **Existing behavior preserved**: Non-streaming `POST /api/chat` remains unchanged (fire-and-forget).
- **Backpressure**: `res.write()` return value checked; if `false`, pause reading from llama.cpp until `drain` event.
