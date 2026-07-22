# Streaming Test & Display Patterns

## Mocking SSE Streams in Vitest

### The Problem
Mocking `Response` bodies with `new Response(encoder.encode(body), { headers })` wrapped in `vi.fn().mockResolvedValueOnce()` doesn't work because the `ReadableStream` inside the `Response` body gets consumed before your test code can read it.

### The Solution
Return a plain object with a manually-implemented `body.getReader()` that yields the exact bytes:

```js
function makeStream(sseChunks) {
  const body = sseChunks.join("") + "data: [DONE]\n\n";
  const encoder = new TextEncoder();
  const encoded = encoder.encode(body);
  
  let idx = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () => {
          if (idx < encoded.length) {
            const chunkSize = Math.min(1024, encoded.length - idx);
            const chunk = encoded.slice(idx, idx + chunkSize);
            idx += chunkSize;
            return Promise.resolve({ value: chunk, done: false });
          }
          return Promise.resolve({ value: undefined, done: true });
        }
      })
    }
  };
}
```

### Error Cases
- **API errors**: return `{ ok: false, status: 502, text: () => Promise.resolve("Bad gateway") }`
- **Network failures**: use `mockRejectedValueOnce(new Error("Network timeout"))`

## Using Chunk Types for Display Logic

### How It Works
- `llama.cpp` guarantees all reasoning chunks arrive before content chunks
- Server emits two event types: `llm-chunk` (content) and `llm-reasoning` (reasoning)
- `appendChunk()` in `ChatView.vue` accumulates:
  - `type === "content"` → `msg.content`
  - `type === "reasoning"` → `msg.reasoning_content`

### Display Phases
| Phase | `reasoning_content` | `content` | UI |
|-------|---------------------|-----------|----|
| 1. Thinking | has text | empty | "Thinking... ⏱️" |
| 2. Responding | has text | growing | content visible, thinking hidden |
| 3. Done | has text | complete | collapsible `<details>` |

### Implementation
In `MessageHistory.vue`, add `!msg.content` to the streaming indicator condition:

```html
<!-- Before -->
<div v-if="isStreaming && msg.reasoning_content" class="thinking-indicator">

<!-- After -->
<div v-if="isStreaming && msg.reasoning_content && !msg.content" class="thinking-indicator">
```

This shows the thinking timer only during phase 1 (reasoning-only), hides it during phase 2 (content flowing), and falls through to the collapsible `<details>` in phase 3.
