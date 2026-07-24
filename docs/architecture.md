---
title: "Architecture"
tags: [architecture, system-design, overview]
topics: [components, data-flow]
keywords: [architecture, system-design, vue, express, directory-structure, file-naming]
summary: "High-level system architecture of Forgekeeper: directory layout, module conventions, file naming, component layers, and data flow."
llm_hints: "Target audience: developers needing to understand the Forgekeeper layout. Covers the component hierarchy, data flow, directory structure, and where to place new files."
---

# Architecture

> **Purpose:** Overview of Forgekeeper's structure and component interactions. Serves as a guide for where files live and how the codebase is organized.

---


## Directory Structure

Overview of the Forgekeeper project directory layout and where source files live.

```text
forgekeeper/
├── src/                    # All source code
│   ├── api/                # Frontend API clients (e.g., chat requests to server)
│   ├── bin/                # CLI entry point
│   ├── components/vue/     # Vue 3 components (.vue files + helpers)
│   ├── config/             # Static configuration (prompts, modes, tokens)
│   ├── monitors/           # System monitors (git status, memory)
│   ├── routes/             # Express route handlers
│   ├── services/           # Business logic services (LLM, parsers, telemetry)
│   ├── stores/             # State management (sessions, cache)
│   ├── themes/             # Theme definitions and manager
│   ├── utils/              # Shared utilities (tokenizer, SSE writer)
│   ├── workflows/          # Workflow definitions (planned)
│   └── server.js           # Express server entry point
├── docs/                   # Documentation
├── e2e/                    # Playwright E2E tests
├── .forgekeeper/           # Session storage (JSON files)
└── dist/                   # Built output (Vite)
```

### Module Conventions

| Directory | Purpose | Examples |
|---|---|---|
| `api/` | Frontend API clients that call server endpoints | `api/chat.js` |
| `components/vue/` | Vue 3 components and their composables/helpers | `App.vue`, `useSseStream.js` |
| `config/` | Static configuration — no runtime side effects | `prompts.yml`, `modes.js` |
| `monitors/` | System health monitors | `gitStatus.js`, `memory.js` |
| `routes/` | Express route handlers (one route per file) | `session.js`, `sse.js` |
| `services/` | Business logic with side effects | `llmService.js`, `telemetry/` |
| `stores/` | State management and session lifecycle | `session.js`, `sessionCache.js` |
| `themes/` | Theme definitions and manager | `defaults.js`, `manager.js` |
| `utils/` | Shared utilities with no dependencies on app state | `sse.js`, `tokenizer.js` |

### File Naming

- **JS files:** lowercase with hyphens → `chat.js`, `session.js`
- **Avoid redundant directory-prefixed names:** `routes/chat.js` not `routes/chatRoutes.js` (directory already implies "routes"). `stores/session.js` not `stores/sessionStore.js`.
- **Vue components:** PascalCase → `ChatView.vue`, `ThemeSettings.vue`
- **Config files:** descriptive kebab-case → `prompts.yml`, `defaults.js`
- **Test files:** colocated with source, named `__tests__/filename.test.js` or `filename.test.js`

### File Organization Rules

- Each file has a single clear purpose, max ~150 lines.
- One exported function/class per file unless cohesive.
- Index/barrel files only for re-exporting directories.
- Related files co-located: `api/chat.js` alongside `api/__tests__/chat.test.js`.

---


## Component Overview

High-level breakdown of the server, UI, and configuration layers that make up Forgekeeper.

### Server Layer

`src/server.js` — Express server that hosts the Vue SPA, provides API endpoints for LLM communication, and proxies chat requests to the LLM proxy. Route handlers are in `src/routes/`, auto-loaded at startup:

| File | Export | Mount |
|---|---|---|
| `routes/server.js` | `{ router }` | `/api/server` |
| `routes/session.js` | `{ router }` | `/api/session` |

Convention: files exporting `{ router }` mount at `/api/<basename>`. Files exporting `{ setup(app) }` handle their own mounting.

### UI Layer

`src/components/vue/App.vue` — Main Vue application component managing state for messages, loading, token usage, and agents.md warnings.

`src/components/vue/ChatView.vue` — Presentational component rendering the chat interface, message history, and input area.

`src/components/vue/*.js` — Vue composables/helpers for UI behavior (e.g., `useSseStream.js` for SSE streaming).

### Configuration Layer

`src/config/prompts.yml` — System prompt configuration loaded by the server.
`src/config/modes.js` — Mode definitions (advisor, architect, implementer, reviewer).
`src/config/tokens.js` — Token limit and estimation configuration.

---


## Data Flow

User input → `App.vue` (handleSubmit) → `chat()` in `api/` → build system prompt (config + agents.md + workflow overlay) → format messages (strip forgekeeper metadata, inject mode labels) → POST to LLM proxy → update messages → render.

---


## Forgekeeper Details

For context management (token estimation, agents.md integration, context pruning, prompt caching), LLM integration (proxy setup, request/response format), and services architecture (LLM service, parser pipeline, telemetry, session management), see [forgekeeper.md](forgekeeper.md).

---


## Modes and Workflows

For agent modes (advisor, architect, implementer, reviewer), prototyping workflow, coding workflow, mode switching, and session management, see [modes-and-workflows.md](modes-and-workflows.md).
