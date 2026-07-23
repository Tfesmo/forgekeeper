# Log → Telemetry Ecosystem

## Status

**Phases 0–11: Complete.** Phases 0–10 (infrastructure + wiring) implemented. Phase 11 (config file) created. Phase 12 (tests) pending.

## Overview

Build an extensible log monitoring and telemetry pipeline that tails server log files, parses log lines using configurable regex patterns, emits normalized events, and streams them to the frontend via a multiplexed SSE endpoint.

---

## Phase 0: Dependencies & Setup

- [x] Install `tail-file` (`npm install tail-file`)
- [x] Verify `js-yaml` is in `package.json` for YAML config parsing

---

## Phase 1: Config (`src/services/parserPipeline/config.js`)

- [x] Implement YAML loading via `js-yaml`
- [x] Deep-merge `defaults` → user config
- [x] Resolve `log_path` with `os.homedir()` for `~` expansion
- [x] Validate regex patterns at startup (fail fast on invalid regex)
- [x] Expose merged config to pipeline consumers
- [x] Default config embedded in `config.js` (no external defaults file needed)

---

## Phase 2: Parsers (`src/services/parserPipeline/parsers/`)

- [x] `baseParser.js` — abstract interface: `{ name, regex, parse(line) }`
- [x] `regexParser.js` — implements `baseParser`, compiles regex once, extracts capture groups
- [x] `index.js` — registry that builds parsers from config + events

---

## Phase 3: Event Schema (`src/services/telemetry/event.js`)

- [x] Define event shape: `{ type, server, timestamp, fields, rawLine }`
- [x] Factory function `createEvent(type, server, fields, rawLine)`

---

## Phase 4: Pipeline (`src/services/parserPipeline/pipeline.js`)

- [x] Accept config + parsers + event factory
- [x] Receive raw lines from log monitor
- [x] Find active parsers based on server type and patterns from config
- [x] Match line against each active parser
- [x] On match: emit normalized event
- [x] On non-match: short-circuit (no downstream work)
- [x] Auto-start if `log_path` is specified in config; otherwise idle

---

## Phase 5: Emitter (`src/services/telemetry/emitter.js`)

- [x] Pub/sub event bus
- [x] `subscribe(listener)` → returns unsubscribe function
- [x] `emit(event)` → broadcast to all listeners
- [x] Handle listener errors without breaking the emitter

---

## Phase 6: SSE Writer (`src/utils/sseWriter.js`)

- [x] Wrap Express `res` with SSE boilerplate
- [x] `writeHead()` with `text/event-stream`, `no-cache`, `keep-alive`
- [x] `sendEvent(eventType, data)` → writes `event: ${type}\ndata: ${JSON}\n\n`
- [x] `end()` → `res.end()`
- [x] Sequence numbering for event ordering

---

## Phase 7: Stream Handler (`src/services/telemetry/streamHandler.js`)

- [x] Receive telemetry events from emitter
- [x] Receive session events from session route interface
- [x] Merge both event streams into a single SSE response
- [x] `endSession()` detaches session listeners but keeps connection open for telemetry
- [x] Handle client disconnect gracefully

---

## Phase 8: Log Monitor (`src/services/logMonitor.js`)

- [x] Modified `logMonitor.js` to feed lines into pipeline
- [x] Uses `tail-file` to tail from end of file
- [x] Error handling: missing file, permission issues, tail errors

---

## Phase 9: Session Routes (`src/routes/sessionRoutes.js`)

- [x] Refactored session SSE to use stream handler interface
- [x] Session route no longer writes directly to `res`
- [x] Wired session `sendEvent` into stream handler
- [x] Uses shared telemetry emitter from pipeline

---

## Phase 10: Server Setup (`src/server.js`)

- [x] Load config on startup
- [x] Initialize pipeline with config + parsers
- [x] Initialize emitter
- [x] Wire pipeline → emitter → stream handler
- [x] Register SSE endpoint on Express app
- [x] Auto-start pipeline if `log_path` is configured

---

## Phase 11: Config File Generation

- [x] Created `.forgekeeper/telemetry.yml` with ikllama defaults
- [x] Include: throughput (prompt + response), progress, cache, draft acceptance rate patterns
- [x] Include sample `servers` section for user customization
- [ ] Generate on first run if file doesn't exist (future enhancement)

---

## Phase 12: Tests (Smoke)

- [x] `smoke.test.js` — imports all pipeline/telemetry/logMonitor modules (mocks `tail-file`)
- [x] `server.static.test.js` — runs `node --check` on server.js (syntax + static import analysis)

## Phase 12: Tests (Unit + Integration)

- [ ] `parserPipeline/config.test.js` — YAML loading, deep-merge, override resolution
- [ ] `parserPipeline/parsers/regexParser.test.js` — regex matching, extraction, no-match returns null
- [ ] `parserPipeline/pipeline.test.js` — line dispatch, non-matching lines skipped, prompt vs response throughput separation, draft acceptance rate
- [ ] `telemetry/emitter.test.js` — subscribe, emit, unsubscribe, multiple listeners
- [ ] `logMonitor.test.js` — line emission into pipeline, error handling
- [ ] `sseWriter.test.js` — SSE header format, event write, end
- [ ] `sessionRoutes.integration.js` — SSE multiplexing: session events + telemetry events on single connection
- [ ] `parserPipeline/config.test.js` — YAML loading, deep-merge, override resolution
- [ ] `parserPipeline/parsers/regexParser.test.js` — regex matching, extraction, no-match returns null
- [ ] `parserPipeline/pipeline.test.js` — line dispatch, non-matching lines skipped, prompt vs response throughput separation, draft acceptance rate
- [ ] `telemetry/emitter.test.js` — subscribe, emit, unsubscribe, multiple listeners
- [ ] `logMonitor.test.js` — line emission into pipeline, error handling
- [ ] `sseWriter.test.js` — SSE header format, event write, end
- [ ] `sessionRoutes.integration.js` — SSE multiplexing: session events + telemetry events on single connection

### Roadmap: Isolated Test Configs

- [ ] **TBD**: Create a test-specific config that does not define `log_path` — this avoids the tail-file dependency entirely for unit tests of config/pipeline.
- [ ] **TBD**: For telemetry pipeline tests, create a second test config with a temporary file path so the pipeline can be tested end-to-end without a real log file.
- [ ] **TBD**: Consider a `vitest` setup file that applies `vi.mock('tail-file')` globally so no test needs to mock it manually.
- [ ] **TBD**: Split vitest config into two profiles: `unit` (no side effects, no file I/O) and `integration` (full pipeline with temp files).

---

## Test Checkpoints

| Checkpoint | What to verify | When |
|------------|---------------|------|
| T1 | Config deep-merge resolves defaults → user config → server override correctly | After Phase 1 |
| T2 | RegexParser extracts capture groups from known log lines | After Phase 2 |
| T3 | Pipeline routes matching lines to parsers and produces normalized events | After Phase 4 |
| T4 | Non-matching lines are short-circuited (no event emitted) | After Phase 4 |
| T5 | Emitter broadcasts events to all subscribers | After Phase 5 |
| T6 | SSE writer produces valid SSE format with event types | After Phase 6 |
| T7 | StreamHandler merges session + telemetry events into single SSE stream | After Phase 7 |
| T8 | Frontend `EventSource` receives both `llm-chunk` and `throughput` events | After Phase 9 + 10 |
| T9 | Session end does not close SSE connection for telemetry | After Phase 9 |
| T10 | Pipeline auto-starts when `log_path` is configured, stays idle otherwise | After Phase 10 |

---

## Notes

- **Siloed parsing**: The parser owns filtering. The log monitor just tails — it never looks at content.
- **No pre-filtering at tail**: Precompiled regex is only ~1.5x the cost of `includes()`. The real optimization is short-circuiting downstream work on non-match.
- **Config-driven**: All patterns live in YAML. No code changes needed to add a new pattern.
- **Per-server config**: Users can override parsers per server (e.g., `qwen` vs `qwen36` vs `gemma`).
- **SSE multiplexing**: Single connection, multiple event types. `event:` prefix distinguishes session vs telemetry events.
- **Session independence**: `endSession()` detaches session listeners without closing the SSE connection.
- **Resilience**: Invalid regex fails fast at startup. Parser returns `null` for non-matches — no crashes.
- **Prompt vs response throughput**: Distinguished by log prefix (`prompt eval time` vs `eval time`), not by the numeric value.
- **Draft acceptance rate**: MTP-specific metric (Qwen3.6+). Ratio of accepted draft tokens to generated tokens.

---

## Confirmed Patterns (ikllama log samples)

| Type | Regex | Matches | Extracts |
|------|-------|---------|---------|
| `prompt_throughput` | `prompt eval time = .*(\d+\.?\d*)\s*tokens\s+per\s+second` | 337 | number (float) |
| `response_throughput` | `eval time = .*(\d+\.?\d*)\s*tokens\s+per\s+second` | 337 | number (float) |
| `progress` | `progress=([\d.]+)` | 903 | number (float, 0.0–1.0) |
| `cache` | `(kv_cache_clear\|kv cache rm)` | 902 | type string |
| `draft_rate` | `draft acceptance rate = ([\d.]+)` | 336 | rate (float) |

**Note on throughput:** Two-phase inference. `prompt eval time` = prompt evaluation (batch, fast). `eval time` = response generation (autoregressive, slower). Both report `X tokens per second` at end of phase — they look identical by the raw number but have distinct prefixes in the log.
