# SSE Two-Step Architecture Refactor

## Overview

Replace the single POST-to-stream endpoint with a two-step SSE flow:
1. **POST `/api/chat/stream`** — Accept the message, reject if session already has active stream
2. **GET `/api/chat/stream/:sessionId`** — Client connects via `EventSource` for streaming response

Aligns with `sse-guide.txt` (idiomatic EventSource + `res.writeHead()`) and `drafts/streaming.md` (distinct event types).

---

## Phase 1: Backend Routes (`src/routes/chatRoutes.js`)

- [x] Simplify `POST /stream` to only accept message and return `{accepted: true}`
- [x] Add `GET /stream/:sessionId` SSE endpoint
- [x] Use `res.writeHead(200, headers)` instead of `setHeader` + `flushHeaders`
- [x] Send initial connected event: `data: {"type":"connected"}\n\n`
- [x] Stream with distinct event types:
  - [x] `event: llm-chunk` → content chunks
  - [x] `event: llm-reasoning` → reasoning chunks
  - [x] `event: llm-done` → completion with final message
  - [x] `event: llm-error` → error event
- [x] Format: `event: <type>\ndata: <json>\n\n`
- [x] Handle client disconnect via `req.on('close')` with `res.writableEnded` guard
- [x] Remove `[DONE]` line from stream completion

---

## Phase 2: Frontend (`src/components/vue/ChatView.vue`)

- [x] Two-step `connectToStream()` flow:
  - [x] POST to `/api/chat/stream` first
  - [x] Connect `EventSource` to `GET /api/chat/stream/:sessionId`
- [x] Use `addEventListener` for distinct event types:
  - [x] `connected` — log connection success
  - [x] `llm-chunk` — append content chunks
  - [x] `llm-reasoning` — append reasoning chunks
  - [x] `llm-done` — push final message, update tokens, close EventSource
  - [x] `llm-error` — display error, close EventSource
- [x] Handle `eventSource.onerror` for connection failures
- [x] Remove old `fetch`+`getReader()` streaming logic
- [x] Remove `[DONE]` handling (relies on `done: true` in event data)

---

## Phase 3: Cleanup

- [x] Remove `fetch` + `response.body.getReader()` streaming code from frontend
- [x] Remove `[DONE]` SSE event from backend
- [x] Remove `res.setHeader` + `flushHeaders` pattern
- [x] Remove dead code in non-streaming `POST /` endpoint if deemed obsolete

---

## Alignment Checklist

| Requirement | Source | Status |
|------------|--------|--------|
| `res.writeHead(200, headers)` | sse-guide.txt | ✅ |
| Initial connected event | sse-guide.txt | ✅ |
| `data: <json>\n\n` format | sse-guide.txt | ✅ |
| EventSource API client | sse-guide.txt | ✅ |
| `addEventListener` for event types | sse-guide.txt | ✅ |
| Distinct event types (`llm-chunk`, `llm-reasoning`, etc.) | drafts/streaming.md | ✅ |
| AbortController on disconnect | drafts/streaming.md | ✅ |
| No buffering — immediate `res.write()` | drafts/streaming.md | ✅ |

---

## Test Checkpoints

| Checkpoint | What to verify | When |
|------------|---------------|------|
| T1 | `POST /stream` returns `{accepted: true}` | After Phase 1 |
| T2 | `POST /stream` returns 409 if session already streaming | After Phase 1 |
| T3 | `GET /stream/:sessionId` streams `llm-chunk` events | After Phase 1 + 2 |
| T4 | Frontend EventSource handles all event types | After Phase 2 |
| T5 | Full end-to-end: POST → EventSource → UI updates | After Phase 2 |
