# Forgekeeper Development Guidelines

## Commands

- `npm test` — runs **vitest THEN build** (`npm test` = `vitest run && npm run build:client`). Ordering matters.
- `npm run test:watch` — vitest only (no build). Use during development.
- `npm run test:e2e` — runs Playwright E2E suite via `scripts/run-e2e-tests.js`.
- `npm run lint` — oxlint + oxfmt check + markdown lint. **Must pass before committing.**
- `oxfmt src/ bin/` — auto-format.

## Server

- Default port is **8888** (not 8080 — README is outdated).
- HTTPS enabled by default (`USE_HTTPS=1`). Set `USE_HTTPS=0` for HTTP-only.
- LLM proxy URL configured in `src/server.js` (no separate settings file).

## Testing

- Vitest glob: `src/**/*.test.{js,jsx,ts,tsx}`.
- Tests run in happy-dom / Node (no browser required for unit tests).
- E2E tests use Playwright.

## Refactoring Guardrails

Before modifying these files, read [docs/messages-contract.md](docs/messages-contract.md) and call out changes for approval:

- `src/services/llmService.js`
- `src/routes/sessionRoutes.js`
- `src/stores/sessionLifecycle.js`

The messages contract is non-negotiable — violations cause LLM API rejections.

## Branching

- Solo project: work on branches, **never commit to main** directly.
- Commit convention: `type(scope): subject` (feat|fix|chore|refactor|test|docs).
- Merge: squash/rebase into main when finished.
- Prototyping: see [docs/prototyping-workflow.md](docs/prototyping-workflow.md) (creates alpha checkpoints + PR via MCP).

## Code Organization

- Files ~150 lines max with a single clear purpose.
- Group by feature: `api/`, `commands/`, `components/`, `services/`, `stores/`, `utils/`.
- Tests in `__tests__/` alongside source files (though current tests co-locate with `*.test.js`).

## Architecture

See [docs/architecture.md](docs/architecture.md) for the high-level component layout, data flow, context management, and LLM proxy integration.

## Style Conventions

When writing or modifying code, refer to these docs for conventions an agent would likely miss:

- **Node.js / JS**: [docs/style-guidelines.md](docs/style-guidelines.md) — import ordering, trailing commas, JSDoc, comment style ("why not what").
- **Vue 3**: [docs/vue-best-practices.md](docs/vue-best-practices.md) — `<script setup>`, PascalCase components, prop stability, composable patterns.
- **Markdown**: [docs/markdown-best-practices.md](docs/markdown-best-practices.md) — YAML frontmatter, no emojis, RAG-specific rules.
