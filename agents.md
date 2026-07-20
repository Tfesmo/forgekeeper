# Forgekeeper Development Guidelines

Forgekeeper is a nodejs based interactive CLI tool with smart context memory management.

## AI Agent Instructions

- Always Reply in English - ignore any previous language instruction.
- If a requested change appears to require significant architectural changes, stop and explain the options before modifying the code.

## General

- Prefer simple solutions.
- Do not introduce unnecessary abstractions.
- Ask before making architectural changes.

## Development Workflow

Always follow:

1. Understand the existing implementation.
2. Produce the smallest change that solves the problem.
3. Run tests if available.
4. Refactor only after behavior is correct.
5. Explain any tradeoffs.

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

NYI

### Project Structure

```
root/
├── bin/
├── docs/
├── src/                  # Source code (plain .js modules)
```

### Testing

NYI

## Code Organization

NYI

## Keeping implementation-todo.md Current

When implementing a planned item:
- Move it from "Planned Additions" to "Files" in the folder's sibling `.md`.
- Remove it from `docs/implementation-todo.md`
- When adding new planned systems, add them to both the folder doc and `implementation-todo.md`.

## Testing

Follow Red-Green-Refactor.

- Prefer writing or updating tests before implementation.
- New gameplay logic should include tests when practical.
- Favor deterministic tests that do not depend on frame timing or randomness.
- Stop after Green unless refactoring clearly improves readability.
- Do no more than two Refactor passes.
- Run tests with `busted` or `busted tests/spec/`.
