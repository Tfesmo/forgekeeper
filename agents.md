# Forgekeeper Development Guidelines

## AI Agent Instructions

- Always reply in English.
- Stop and explain options before changes requiring significant architectural modifications.
- You are running on limited resources, and must be careful of your use or you will fail.
    - Prefer tools like `rg` to search for the information you want, followed by targetted partial file reads.  You are not prohibited from reading full files when necessary.
    - Be careful when making web searches - unless instructed to, do not pull in entire files unless required to complete your instructions.

## General

- Prefer simple solutions.
- Do not introduce unnecessary abstractions.
- Ask before making architectural changes.

## Refactoring Guardrails

Before refactoring any file in this list, you MUST read [messages-contract.md](docs/messages-contract.md) and call out proposed changes to the user for approval:

- `src/services/llmService.js`
- `src/routes/sessionRoutes.js`
- `src/stores/sessionLifecycle.js`

The messages contract is non-negotiable — violating it causes the LLM API to reject requests.

## Development Workflow

1. Understand the existing implementation in the relevant `src/` module.
2. Produce the smallest change that solves the problem.
3. Run tests with `npm test` or `npm run test:watch`.
4. Refactor only after behavior is correct.
5. Explain any tradeoffs.

For detailed workflow, see [development-guide.md](docs/development-guide.md).

## Commits

- **Conventional Commits**: `type(scope): subject` (type = feat|fix|chore|refactor|test|docs)
- **Atomic**: one logical change per commit. Imperative mood, subject <50 chars.
- **Body**: explain what/why — diff shows how.
- **Branch naming**: `feat/<desc>` or `fix/<desc>`.
- **NEVER commit to `main`** — always use a work branch (solo project, no PRs). Exception: prototyping mode (see [prototyping-workflow.md](docs/prototyping-workflow.md)).

## Branching Workflow

- Always work on a branch — never commit multi-step changes to `main`.
- Squash/rebase merge into `main` when finished and tested.
- Exception: single-line fixes (typos, config) go directly to `main`.
- Rejected work: delete the branch.

## Prototyping

For the full prototyping workflow — planning, checklists, reminders, permissions, and commit restrictions — see [prototyping-workflow.md](docs/prototyping-workflow.md).

Prototyping produces an alpha-quality checkpoint, not a finished feature. Commit after each task, create a PR at the end (MCP blocks direct commits to `main`).

## Node.js Ecosystem & Tooling

### Formatting & Linting

Lint with `npm run lint` (oxlint + oxfmt). Auto-format with `oxfmt src/ bin/`.

### Project Structure

See [architecture.md](docs/architecture.md#8-project-structure) for the full layout.

```
root/
├── docs/                 # Documentation
├── src/                  # Source code
│   ├── components/       # Vue.js UI components
│   ├── config/           # YAML configuration files
│   └── server.js         # Express server and LLM proxy
├── agents.md             # AI agent instructions (this file)
```

### Testing

Tests run with vitest: `npm test` (one-shot) or `npm run test:watch` (watch mode).

See [development-guide.md](docs/development-guide.md#5-testing) for test writing conventions.

## Code Organization

See [modes-and-workflows.md](docs/modes-and-workflows.md) for mode layout and [architecture.md](docs/architecture.md#7-project-structure) for component layout.

General rules:

- ~150-line max files with a single clear purpose.
- Group files by feature: `api/`, `commands/`, `components/`.
- Place tests in `__tests__/` alongside source files.

For full style rules, see [style-guidelines.md](docs/style-guidelines.md).

## Configuration

- User settings: no longer used (see [configuration.md](docs/configuration.md#1-user-settings))
- Agent instructions: `agents.md` in the project root (see [configuration.md](docs/configuration.md#3-agentsmd))
- LLM proxy: configured in `src/server.js` (see [configuration.md](docs/configuration.md#4-llm-proxy-configuration))

## Roadmap

See [roadmap.md](docs/roadmap.md) for planned features and current status.
