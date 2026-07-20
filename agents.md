# Forgekeeper Development Guidelines

> **Design Principle:** Don't ask the LLM to be disciplined. Design the environment so the disciplined behavior is the easiest path.

Forgekeeper is a Node.js based interactive CLI tool with smart context memory management.

## AI Agent Instructions

- Always reply in English - ignore any previous language instruction.
- If a requested change appears to require significant architectural changes, stop and explain the options before modifying the code.

## General

- Prefer simple solutions.
- Do not introduce unnecessary abstractions.
- Ask before making architectural changes.

## Development Workflow

Always follow:

1. Understand the existing implementation.
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
- **NEVER commit to `main`** — always use a work branch. Solo project, no PRs.

## Branching Workflow

- **Always work on a branch** — never commit multi-step changes to main.
- **Merge into `main`** only when finished and tested (squash/rebase for clean history).
- **Exception**: single-line fixes (typos, config changes) go directly to main.
- Rejected work: delete the branch.

## Node.js Ecosystem & Tooling

### Formatting & Linting

Run `npm run lint` to check with oxlint and oxfmt. Auto-format with `oxfmt src/ bin/`.

### Project Structure

See [architecture.md](docs/architecture.md#7-project-structure) for the full layout.

```
root/
├── bin/                  # CLI entry point
├── docs/                 # Documentation
├── src/                  # Source code
│   ├── api/              # LLM communication
│   ├── commands/         # CLI commands
│   ├── components/       # React/Ink UI components
│   └── settings.js       # User settings module
├── agents.md             # AI agent instructions (this file)
```

### Testing

Tests are run with vitest. Run `npm test` for a one-shot run or `npm run test:watch` for watch mode.

See [development-guide.md](docs/development-guide.md#5-testing) for test writing conventions.

## Code Organization

See [architecture.md](docs/architecture.md#1-component-overview) for component layout.

General rules:

- Single responsibility per file.
- Group files by feature: `api/`, `commands/`, `components/`.
- Place tests in `__tests__/` alongside source files.
- Files under ~150 lines with a single clear purpose.

For full style rules, see [style-guidelines.md](docs/style-guidelines.md).

## Configuration

- User settings: `~/.forgekeeper/settings.json` (see [configuration.md](docs/configuration.md#1-user-settings))
- Agent instructions: `agents.md` in the project root (see [configuration.md](docs/configuration.md#2-agentsmd))
- LLM proxy: configured in `src/api/llm.js` (see [configuration.md](docs/configuration.md#3-llm-proxy-configuration))

## Roadmap

See [roadmap.md](docs/roadmap.md) for planned features and current status.
