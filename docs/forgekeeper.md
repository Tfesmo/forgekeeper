---
title: "Forgekeeper"
tags: [forgekeeper, context-management, llm-integration, services]
topics: [context, token-counting, prompts, message-structure, session-lifecycle]
keywords: [forgekeeper, context, tokens, agents.md, mode-tracking, LLM proxy, session management, telemetry, parser pipeline]
summary: "Operational details of Forgekeeper: context management, LLM proxy integration, services, and session lifecycle."
llm_hints: "Target audience: developers working on Forgekeeper's core behavior. Covers token estimation, context pruning, prompt caching, LLM proxy setup, and service structure."
---

# Forgekeeper

> **Purpose:** Operational details of Forgekeeper's behavior — context management, LLM integration, services, and session lifecycle. For structural/layout details, see [architecture.md](architecture.md).

---


## Context Management

Forgekeeper manages conversation context with two key mechanisms:

### Token Estimation

Uses `@anthropic-ai/tokenizer` for accurate token counting, falling back to character / 4 heuristic. Token usage is displayed in the UI after each response.

### Agents.md Integration

`agents.md` is loaded from the project root at startup and on the first user message, truncated to 10,000 characters. A warning is shown if it exceeds this limit. `loadAgentsMd()` returns an empty string if the file does not exist.

### Context Limit

Fixed at 64,000 tokens (`CONTEXT_LIMIT`). Token usage is tracked and displayed after each exchange.

### Tool Cost System

`cost` represents **context/information cost**, not execution time. Tools are exposed as MCPs with an associated cost. Key principle: prefer searching with `rg` before reading files; retrieve only relevant sections.

### Tool Output Normalizer

Tools should not blindly dump output into the LLM context. Output passes through a normalizer returning `{ summary, details? }`. Tests return pass/fail summaries, git diff returns relevant summaries first, large files expandable on demand.

### Prompt Caching Strategy

Avoid changing the initial/system prompt to preserve cache efficiency. The static cached prompt (from `prompts.yml`) contains base identity, available modes, tool protocol, and general rules. Per-request overlay (injected via `formatMessagesForLLM`) contains mode labels and mode transitions.

### Context Pruning Rules

Preserve core system messages, current mode, and most recent starting mode. Remove old tool output and superseded mode declarations.

### Message Structure

Messages carry `forgekeeper` metadata alongside standard LLM message fields:

```json
{
  "role": "user",
  "content": "Investigate terrain movement bug",
  "forgekeeper": {
    "mode": "analyst"
  }
}
```

The `forgekeeper.mode` field is injected by the Vue frontend on user message submission and stripped by the Express server before sending to the LLM. Mode transitions are detected server-side:

- First non-system message with a forgekeeper mode → prepends `[Mode: analyst]` to content
- Mode changes from previous forgekeeper message → prepends `[Mode Transition: analyst → implementer]`
- Same mode as previous → no injection

Forgekeeper metadata is never sent to the LLM — used only for mode tracking and transition detection.

---


## LLM Integration

Forgekeeper connects to a local LLM proxy rather than a cloud API directly.

### Proxy Configuration

- **Base URL**: `http://127.0.0.1:8080` (configured in `src/server.js`)
- **Model**: `qwen`
- **API endpoint**: `/v1/chat/completions` (OpenAI-compatible format)

### Request Format

```json
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "qwen",
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    { "role": "user", "content": "<user message>" }
  ],
  "max_tokens": 4096,
  "top_p": 1
}
```

### Response Handling

Extracts `data.choices[0].message.content`. Returns `[No response]` if empty, throws a descriptive error for non-OK responses. 120-second timeout via `AbortSignal.timeout()`.

---


## Services Architecture

Details on the LLM service, parser pipeline, telemetry, and session management stores.

### LLM Service

`src/services/llmService.js` — Handles all LLM communication: building prompts, calling the proxy, parsing responses. **Protected file** — modifications require checking `docs/messages-contract.md` first.

### Parser Pipeline

`src/services/parserPipeline/` — Pluggable parser system for processing LLM tool call responses:
- `pipeline.js` — Orchestration layer
- `baseParser.js` — Abstract parser class
- `parsers/regexParser.js` — Regex-based parser implementation
- `config.js` — Parser configuration

### Telemetry

`src/services/telemetry/` — Event emission and streaming telemetry:
- `event.js` — Telemetry event definitions
- `telemetryEmitter.js` — Event emitter for telemetry
- `streamHandler.js` — Handles streaming telemetry output

### Session Management

`src/stores/session.js` — Core session state (messages, mode, token usage).
`src/stores/sessionLifecycle.js` — Session creation, loading, and persistence lifecycle. **Protected file** — modifications require checking `docs/messages-contract.md` first.
`src/stores/sessionCache.js` — In-memory session cache.
`src/stores/sessionFileOps.js` — File I/O for session persistence.
