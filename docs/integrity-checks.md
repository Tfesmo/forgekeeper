# Integrity & Verification

> **Purpose:** Two approaches for monitoring message and context integrity. Option 2 is low-complexity and reactive. Option 3 is proactive with per-message guarantees.

---

## Table of Contents

- [Option 2: Log Monitoring](#option-2-log-monitoring)
- [Option 3: Hash Chain](#option-3-hash-chain)
- [Comparison](#comparison)
- [Recommendation](#recommendation)

---

## Option 2: Log Monitoring

### Overview

Monitor server logs for the `erased invalidated context checkpoint` line and flag resets that occur outside of expected session transitions.

### Backend

Track context resets per-session with a counter:

```js
let contextResetCount = 0;
let lastResetSession = null;

// When "erased invalidated context checkpoint" is detected:
function handleContextReset(newSessionId) {
  if (newSessionId !== lastResetSession) {
    // Session change — expected, reset counter
    lastResetSession = newSessionId;
    contextResetCount = 0;
  } else {
    // Same session — unexpected, increment
    contextResetCount++;
  }
}
```

### Frontend

Receive reset count via a metrics endpoint or `/status` extension:

```js
router.get("/status", (_, res) => {
  res.json({
    messages: conv.messages.filter(m => m.role !== "system"),
    done: conv.done,
    error: conv.error,
    tokensUsed: conv.tokensUsed ?? 0,
    tokensTotal: 64000,
    contextResetCount,
  });
});
```

- Show a **session banner** when `contextResetCount > 0` after a non-switch:
  - "Context was reset" with tooltip explaining the cause
  - No per-message granularity — session-level signal only

### Metrics endpoint (optional)

```js
router.get("/metrics", (_, res) => {
  res.json({
    contextResetCount,
    lastResetSession,
    currentSession,
  });
});
```

### Tradeoffs

| Pros | Cons |
|------|------|
| Zero complexity on message path | Reactive — detects after the fact |
| Leverages existing log signal | No per-message integrity signal |
| No frontend state overhead | Requires session tracking logic |
| Easy to toggle on/off | Depends on log format stability |

---

## Option 3: Hash Chain

### Overview

SHA-256 hash chain where each user message carries a `last` reference to the previous state hash, and `current` is stored on the conversation object after each assistant response.

### Flow

1. **POST /chat**: user message pushed → `forgekeeper.last = conv.currentHash` → LLM call starts
2. **callLLM completes**: assistant pushed → `conv.currentHash = hash(all messages)`
3. **GET /status**: returns `currentHash` alongside messages

Frontend compares `msg.forgekeeper.last` with the last `currentHash` from `/status` — green check if match, red X if not.

### Files

**`src/services/hashChain.js`**

```js
import { createHash } from 'node:crypto';
import { prepareMessagesForAPI } from './llmService.js';

const HASH_CHAIN_ENABLED = process.env.HASH_CHAIN_ENABLED === "true";

export function computeMessageHash(messages) {
  if (!HASH_CHAIN_ENABLED) return null;
  const apiMessages = prepareMessagesForAPI(messages);
  const json = JSON.stringify(apiMessages);
  return createHash('sha256').update(json).digest('hex');
}

export function attachLastHash(conv, message) {
  if (!HASH_CHAIN_ENABLED) return message;
  if (message.forgekeeper) {
    message.forgekeeper.last = conv.currentHash ?? null;
  }
  return message;
}

export function updateCurrentHash(conv) {
  if (!HASH_CHAIN_ENABLED) return null;
  conv.currentHash = computeMessageHash(conv.messages);
  return conv.currentHash;
}
```

**`src/routes/chatRoutes.js`**

```js
import { attachLastHash } from '../services/hashChain.js';

// In POST handler, after conv.messages.push(...):
attachLastHash(conv, conv.messages[conv.messages.length - 1]);

// In GET /status handler, add to response:
currentHash: conv.currentHash,
```

**`src/services/llmService.js`**

```js
import { updateCurrentHash } from './hashChain.js';

// After assistant message pushed (line ~57):
updateCurrentHash(conversation);
```

**`src/services/hashChain.test.js`**

```js
import { describe, it, expect } from "vitest";
import { computeMessageHash, attachLastHash, updateCurrentHash } from "./hashChain.js";

describe("hashChain", () => {
  it("computeMessageHash produces deterministic output", () => {
    const messages = [{ role: "system", content: "Hello" }];
    const hash1 = computeMessageHash(messages);
    const hash2 = computeMessageHash(messages);
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[0-9a-f]{64}$/);
  });

  it("different messages produce different hashes", () => {
    const messages1 = [{ role: "user", content: "Hello" }];
    const messages2 = [{ role: "user", content: "World" }];
    expect(computeMessageHash(messages1)).not.toBe(computeMessageHash(messages2));
  });

  it("forgekeeper metadata is stripped before hashing", () => {
    const messages = [
      { role: "user", content: "Hello", forgekeeper: { mode: "analyst", last: null } },
    ];
    const hash = computeMessageHash(messages);
    const stripped = [{ role: "user", content: "Hello" }];
    expect(hash).toBe(computeMessageHash(stripped));
  });

  it("attachLastHash sets last to conv.currentHash", () => {
    const conv = { currentHash: "abc123", messages: [] };
    const msg = { role: "user", content: "Hi", forgekeeper: { mode: "analyst" } };
    attachLastHash(conv, msg);
    expect(msg.forgekeeper.last).toBe("abc123");
  });

  it("attachLastHash sets last to null when no currentHash exists", () => {
    const conv = { messages: [] };
    const msg = { role: "user", content: "Hi", forgekeeper: { mode: "analyst" } };
    attachLastHash(conv, msg);
    expect(msg.forgekeeper.last).toBeNull();
  });

  it("updateCurrentHash sets conv.currentHash", () => {
    const conv = { messages: [{ role: "system", content: "Hello" }] };
    const hash = updateCurrentHash(conv);
    expect(conv.currentHash).toBe(hash);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});
```

**`src/server.test.js` mock**

After assistant push in mock router (line ~95):

```js
import { updateCurrentHash } from "../services/hashChain.js";
// after c.messages.push(...):
updateCurrentHash(c);
```

In mock /status (line ~107-119), add:

```js
currentHash: conv.currentHash,
```

### Tradeoffs

| Pros | Cons |
|------|------|
| Tamper-evident per message | Requires extra file (hashChain.js) |
| Clear frontend signal (green/red) | One sha256 per assistant response |
| Deterministic and testable | Extra field in /status response |
| Toggleable via env var | Slightly more code paths |
| Works today regardless of SSE migration | Needs rework if SSE streaming is added later |

---

## Comparison

| Criterion | Option 2: Log Monitoring | Option 3: Hash Chain |
|-----------|--------------------------|---------------------|
| Complexity | Very low | Low-moderate |
| Signal type | Session-level banner | Per-message checkmark |
| Proactive vs reactive | Reactive | Proactive |
| Tamper-evident | No | Yes |
| Frontend state | `contextResetCount` (integer) | `forgekeeper.last` + `currentHash` |
| SSE impact | Unaffected | Needs rework for streaming |
| Toggle | Always-on, cheap | Env var, zero-cost when off |
| Testability | Log parsing tests | Deterministic hash assertions |
| Implementation time | ~30 min | ~1 hour |

---

## Recommendation

**Start with Option 2.** It's the lowest-effort path and gives you a working signal immediately. The server log line `erased invalidated context checkpoint` already exists as a signal — you're just adding session tracking around it.

**Add Option 3 later** when you want the per-message integrity check. The design is already outlined above and ready to implement. The indexed metadata store (from earlier discussions) is the riskiest option — it introduces a new data structure that must stay perfectly synchronized with the messages array and loses the tamper-evident guarantee that makes Option 3 interesting.
