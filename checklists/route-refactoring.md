---
title: "Route refactoring: auto-load, rename, test consolidation"
tags: [refactor, routes, testing, structure]
topics: [architecture, directory-structure, module-loading]
keywords: [auto-load, dynamic import, Express routes, test consolidation, directory structure]
summary: "Plan to refactor routes to auto-loading pattern, rename route files to follow conventions, consolidate test files into __tests__/ directories, and clean up empty directories."
llm_hints: "Target audience: developers executing the refactoring. Each phase is independent and can be committed separately. Run `npm test` after Phase 2 completes to verify all routes still work."
---

# Route Refactoring Checklist

> **Goal:** Align `src/routes/` with architecture conventions, auto-load routes in `server.js`, and consolidate test files.

---

## Phase 0: Auto-load routes in `server.js`

- [x] Rename route files (see Phase 1)
- [x] Update `src/server.js`:
  - [x] Remove explicit route imports (4 imports)
  - [x] Add dynamic discovery loop over `routes/` directory
  - [x] Convention: files exporting `{ router }` → mounted at `/api/<basename>`
  - [x] Convention: files exporting `{ setup }` → called as `setup(app)`
  - [x] Skip `options.js` (shared handler, no router/setup export)
- [x] Update `src/server.test.js`:
  - [x] Update route imports to match renamed files
  - [x] Verify routes mount at expected paths after auto-load

### Route file mapping

| Current name | New name | Export type | Mount path |
|---|---|---|---|
| `serverApiRoutes.js` | `server.js` | `{ router }` | `/api/server` |
| `sessionRoutes.js` | `session.js` | `{ router }` | `/api/session` |
| `sseRoutes.js` | `sse.js` | `{ setup }` | `setup(app)` |
| `uiRoutes.js` | `ui.js` | `{ setup }` | `setup(app)` |
| `options.js` | *(unchanged)* | shared handler | — skip |

> **Note:** The renamed route files must export a consistent property name for the auto-loader to detect.
> - `serverApiRoutes.js` currently exports `serverApiRouter` — rename to `router`
> - `sessionRoutes.js` currently exports `{ router as sessionRoutes }` — rename to `{ router }`
> - `uiRoutes.js` currently exports `{ router as uiRoutes }` — rewrite as `{ setup(app) }` to mount at `/`
> - `sseRoutes.js` currently exports `setupSseRoutes` — rename to `setup`

### Auto-load convention

```js
// server.js — after app setup, before starting server
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const routesDir = path.join(__dirname, "routes");

const files = fs.readdirSync(routesDir).filter(f =>
  f.endsWith(".js") && f !== "options.js" && !f.startsWith("__tests__")
);
for (const file of files) {
  const mod = await import(path.join(routesDir, file));
  if (mod.router) {
    // Mount at /api/<basename> (e.g., server.js → /api/server)
    const base = path.basename(file, ".js");
    app.use(`/api/${base}`, mod.router);
  }
  if (typeof mod.setup === "function") {
    // Routes that need non-standard mounting (ui.js, sse.js) export setup(app)
    mod.setup(app);
  }
}
```

Note: `ui.js` and `sse.js` both export `setup(app)` — they handle their own mounting and are not auto-mounted by the loop.

---

## Phase 1: Rename route files

- [x] `src/routes/serverApiRoutes.js` → `src/routes/server.js`
- [x] `src/routes/sessionRoutes.js` → `src/routes/session.js`
- [x] `src/routes/sseRoutes.js` → `src/routes/sse.js`
- [x] `src/routes/uiRoutes.js` → `src/routes/ui.js`

---

## Phase 2: Consolidate test files

### Move test files into `__tests__/` directories

- [x] `src/monitors.tests/gitStatus.test.js` → `src/monitors/__tests__/gitStatus.test.js`
- [x] `src/components/vue/chatHelpers.test.js` → `src/components/vue/__tests__/chatHelpers.test.js`
- [x] `src/components/vue/ChatView.test.js` → `src/components/vue/__tests__/ChatView.test.js`
- [x] `src/components/vue/MessageHistory.test.js` → `src/components/vue/__tests__/MessageHistory.test.js`
- [x] `src/components/vue/mount.test.js` → `src/components/vue/__tests__/mount.test.js`
- [x] `src/components/vue/useSseStream.test.js` → `src/components/vue/__tests__/useSseStream.test.js`
- [x] `src/components/vue/useStreamingTimer.test.js` → `src/components/vue/__tests__/useStreamingTimer.test.js`
- [x] `src/stores/sessionLifecycle.test.js` → `src/stores/__tests__/sessionLifecycle.test.js`
- [x] `src/themes/defaults.test.js` → `src/themes/__tests__/defaults.test.js`
- [x] `src/themes/manager.test.js` → `src/themes/__tests__/manager.test.js`
- [x] `src/utils/tokenizer.test.js` → `src/utils/__tests__/tokenizer.test.js`
- [x] `src/services/llmService.test.js` → `src/services/__tests__/llmService.test.js`
- [x] `src/services/telemetry/streamHandler.test.js` → `src/services/__tests__/streamHandler.test.js`
- [x] `src/server.test.js` → `src/routes/__tests__/server.test.js`
- [x] `src/server.static.test.js` → `src/routes/__tests__/server.static.test.js`
- [x] `src/smoke.test.js` → `src/routes/__tests__/smoke.test.js`

### Delete empty directories

- [x] `src/components/__tests__/`
- [x] `src/test/`
- [x] `src/workflows/__tests__/`
- [x] `src/commands/` (with its empty `__tests__/` subdirectory)

---

## Phase 3: Run verification

- [x] `npm test` — vitest pass (143/143 tests pass)
- [x] `npm run build:client` — client build pass
- [x] Verify `GET /api/session/new` still works
- [x] Verify `GET /api/server/options` still works
- [x] Verify `GET /api/stream` still works
- [x] Verify SPA root (`/`) still serves `dist/index.html`

---

## Phase 4: Update documentation

- [x] `docs/architecture.md` — add routes auto-load examples and convention note
- [x] `checklists/backend-readability-audit.md` — mark Phase 1-2 items as complete

---

## Phase dependencies

- Phase 0 requires Phase 1.
- Phase 3 requires Phase 0.
- Phase 4 requires Phase 1.
- Phases 1 and 2 are independent of each other.
