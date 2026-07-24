# Backend Code Readability Audit

## High Priority Issues

### 1. `src/stores/sessionLock.js:4` — **Encapsulation breach** ✅ DONE
- `getWriteLocks()` exported the internal `Map` directly — callers could mutate lock state without going through `withLock`
- **Fix applied**: Replaced with safe accessor `getWriteLockKeys() { return [...writeLocks.keys()] }`

### 2. `src/stores/sessionCache.js:3` — **Encapsulation breach** ✅ DONE
- Internal `sessionCache` Map was exported as a named export — callers bypassed `cacheSet`, `cacheDelete`, and `evictOldest` eviction logic
- **Fix applied**: Removed `export { sessionCache }`; added `getCacheKeys()` for test access; export only accessor functions

### 3. `src/services/parserPipeline/parsers/index.js:8` — **Silent failure** ✅ DONE
- If a parser config referenced a pattern missing from `parsersConfig`, the pipeline silently skipped it with no warning
- **Fix applied**: Added `console.warn` for missing patterns so misconfigured YAML is caught

### 4. `src/stores/sessionFileOps.js:27` — **Generic error on corrupted data** ✅ DONE
- `JSON.parse(readFileSync(...))` collapsed file-not-found, truncated file, corrupt JSON, and permission errors into one exception
- **Fix applied**: Added existence check (returns `null`) + try/catch with `cause` and `code: "INVALID_JSON"` to distinguish missing vs corrupt files

### 5. `src/services/parserPipeline/config.js:68` — **Unhandled YAML parse error** ✅ DONE
- `load()` threw on invalid YAML with no try/catch and no contextual file path in the error
- **Fix applied**: Wrapped in try/catch: `throw new Error(\`Invalid YAML in ${path}: \${err.message}\`)`

---

## Medium Priority Issues

### 6. `src/services/llmService.js:107` — **Confusing short-circuit** ✅ DONE
- `if (!line.startsWith("data:") || line.length <= 5)` — `line.startsWith("data:")` implies length ≥ 5, so the second check read redundantly
- **Fix applied**: Split into two explicit checks:
  ```js
  if (!line.startsWith("data:")) continue;
  const data = line.slice(5).trim();
  if (data === "") continue;
  ```

### 7. `src/stores/sessionLifecycle.js:50` — **Over-clone on every update** ✅ DONE
- `structuredClone` was called on every message for every `updateSession` call — overkill for flat `{ role, content, forgekeeper }` objects
- **Fix applied**: Replaced with shallow spread: `{ ...msg }`

### 8. `src/stores/sessionLifecycle.js:104-116` — **Verbose nested fallbacks** ✅ DONE
- `finalizeSessionOnSuccess` used chained `|| {}` to defensively create nested objects
- **Fix applied**: Used nullish coalescing assignment: `assistantMessage.forgekeeper ??= {};`

### 9. `src/services/parserPipeline/pipeline.js:36` — **Mixed concerns in `drain`** ✅ DONE
- Function handled rate-limiting, batch processing, and scheduling (two different paths: `setTimeout` vs `setImmediate`)
- **Fix applied**: Split into `scheduleDrain()` and `processBatch()`

### 10. `src/services/telemetry/streamHandler.js:65` — **Redundant wrapper** ✅ DONE
- `sendEvent` was a pass-through `writer.sendEvent(eventType, data)` with zero added value
- **Fix applied**: Removed the wrapper; return `{ sendEvent: writer.sendEvent, close: writer.close }`

### 11. `src/services/parserPipeline/parsers/regexParser.js:17` — **Overly lenient parsing** ✅ DONE
- `parseFloat("1.5abc")` returned `1.5` — silently truncated trailing non-numeric characters
- **Fix applied**: Replaced with `Number()` for stricter full-string validation

### 12. `src/utils/deepMerge.js:7-13` — **Dense 6-condition check** ✅ DONE
- Inline condition checked "both sides are non-null, non-array objects" — hard to read at a glance
- **Fix applied**: Extracted `isPlainObject(v)` helper

### 13. `src/routes/serverApiRoutes.js:1-2` — **Dead code** ✅ DONE
- `__filename` and `__dirname` computed via `fileURLToPath` but never used in the file
- **Fix applied**: Removed both lines and unused imports

### 14. `src/routes/options.js` — **Cross-layer dependency** ✅ DONE
- Imported mode config from `../components/vue/chatHelpers.js` — backend route depended on frontend utility module
- **Fix applied**: Created `src/config/modes.js` with `MODE_CONFIG`, `WORKFLOW_MODES`, `DEFAULT_WORKFLOW`; updated `options.js` to import from shared config; `chatHelpers.js` re-exports for backward compatibility

### 15. `src/services/parserPipeline/pipeline.js:48-58` — **Undocumented multi-parser emission** ✅ DONE
- All parsers were checked per line; a line could emit multiple events. No comment explained this design intent.
- **Fix applied**: Added comment: "A line may match multiple parsers and emit multiple events intentionally"

---

## Low Priority — Minor Improvements

| File | Issue | Status |
|------|-------|--------|
| `src/utils/tokenizer.js:20` | Magic `4` in char-to-token ratio | ✅ DONE — `const CHAR_TO_TOKEN_RATIO = 4` |
| `src/services/parserPipeline/config.js:60` | `draft_rate` maps to `acceptance_rate` field | ✅ DONE — added field-mapping comment |
| `src/services/llmService.js:121-132` | Duplicated `if (logFd !== null)` (3 lines each) | ⏸ Deferred — marginal benefit for 3-line duplication |
| `src/services/llmService.js:24` | Unused `buildSystemMessage(_mode)` parameter | ⏸ Deferred — underscore prefix is acceptable compromise |
| `src/services/llmService.js:55` | Magic octal `0o644` | ⏸ Deferred — standard Unix convention |
| `src/services/parserPipeline/pipeline.js:23` | Magic `100` in log-throttle | ⏸ Deferred — acceptable for private constant |
| `src/services/logMonitor.js:6` | Tilde path `"~/logs/ikllama.log"` | ⏸ Deferred — tail-file library handles this; could add dir creation |
| `src/routes/sessionRoutes.js:74-79` | `markFinalized` closure | ⏸ Deferred — function expression marginally cleaner but functionally identical |

---

## Accepted Patterns (Not Issues)

These items from the initial review were evaluated but are **acceptable as-is**:

- **Module-level mutable state** (`logMonitor.js`, `telemetryEmitter.js`, `memory.js`, `gitStatus.js`, `sessionLock.js`): Inherent to these modules; `intervalId` cleanup and singleton patterns are standard. The real concern was proper encapsulation (fixed by items 1, 2).
- **Magic constants as private module vars** (`pipeline.js:5`, `server.js:21`, `server.js:31`): Acceptable for private constants, default fallbacks, and express config.
- **Destructured fs imports** (`llmService.js:1`): Valid Node.js style choice; avoids `fs.` prefix.
- **Barrel re-export** (`sessionStore.js:1`): Standard ESM pattern.
- **`llmService.js:149-160`**: Object construction with `|| null` fallbacks — not optional chaining.
- **`sessionLifecycle.js:74`**: `resolveSessionForStream` scope is acceptable; early-exit pattern is correct.
- **`uiRoutes.js:2`**: `import { fileURLToPath } from "url"` is used for `__dirname` → `PROJECT_ROOT` → static file serving.
