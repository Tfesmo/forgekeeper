---
title: "Development Guide"
tags: [development, workflow, testing, tooling]
topics: [setup, running, testing, linting, project-structure]
keywords: [node.js, development, vitest, oxlint, oxfmt, tsx, ink, react]
summary: "Guide for setting up the development environment, running Forgekeeper locally, writing tests, and following the development workflow."
llm_hints: "Target audience: developers contributing to Forgekeeper. Covers installation, local development setup, testing with vitest, linting with oxlint/oxfmt, and the development workflow."
---

# Development Guide

> **Purpose:** Guide for setting up the development environment, running Forgekeeper locally, writing tests, and following the development workflow.

This document covers everything a developer needs to know to contribute to Forgekeeper.

---

## Table of Contents

- [1. Prerequisites](#1-prerequisites)
- [2. Installation](#2-installation)
- [3. Running Locally](#3-running-locally)
- [4. Development Workflow](#4-development-workflow)
- [5. Testing](#5-testing)
- [6. Linting & Formatting](#6-linting--formatting)
- [7. Adding New Commands](#7-adding-new-commands)
- [8. Adding New Components](#8-adding-new-components)
- [9. Documentation Behavior](#9-documentation-behavior)

---

## 1. Prerequisites

- Node.js (LTS version recommended)
- npm (comes with Node.js)

---

## 2. Installation

```bash
npm install
```

This installs all dependencies listed in `package.json`.

---

## 3. Running Locally

### Development Mode

```bash
npm run dev
```

Runs `tsx src/index.jsx` with hot-reload support via tsx.

### Production Mode

```bash
npm start
```

Runs `node bin/forgekeeper.js` directly.

### Prerequisites

Forgekeeper connects to an LLM proxy at `http://127.0.0.1:8080`. Ensure a compatible proxy (e.g., ollama, lmstudio, or vllm) is running before starting Forgekeeper.

---

## 4. Development Workflow

For the canonical 5-step workflow, commit rules, and branching, see [agents.md](agents.md).

---

## 5. Testing

### Running Tests

```bash
# Run all tests once
npm test

# Watch mode (re-run on file changes)
npm run test:watch
```

Tests are configured via `vitest.config.js` and live in `__tests__/` directories alongside their source files.

### Writing Tests

- Use vitest assertions (`expect`, `describe`, `it`).
- Prefer deterministic tests that do not depend on frame timing or randomness.
- Follow Red-Green-Refactor: write failing test first, implement, then refactor.
- Mock external dependencies (e.g., `fs`, `fetch`) where appropriate.

Example:

```javascript
import { describe, it, expect } from "vitest";
import { estimateTokenCount } from "../llm.js";

describe("estimateTokenCount", () => {
  it("returns token count for messages", () => {
    const messages = [
      { role: "user", text: "Hello" },
      { role: "assistant", text: "Hi there" },
    ];
    const count = estimateTokenCount(messages);
    expect(count).toBeGreaterThan(0);
  });
});
```

---

## 6. Linting & Formatting

### Linting

```bash
npm run lint
```

Runs both oxlint (for linting) and oxfmt (for formatting checks):

```bash
oxlint src/ bin/ && oxfmt --check src/ bin/
```

### Fixing Formatting

Run `oxfmt` without `--check` to auto-format:

```bash
oxfmt src/ bin/
```

### What to Check

- No trailing whitespace
- Consistent indentation (2 spaces)
- Trailing commas in multi-line objects/arrays
- Proper import ordering (built-in, third-party, internal)

For full style rules, see [style-guidelines.md](style-guidelines.md).

---

## 7. Adding New Commands

1. Create a new file in `src/commands/<name>.js`.
2. Export a function that takes `args` and returns a string response.
3. Add the command to the `COMMANDS` object in `src/commands/index.js`.
4. Write tests in `src/commands/__tests__/<name>.test.js`.
5. Document the command in the help text (`COMMANDS.help`).

Example:

```javascript
// src/commands/roll.js
export function roll(args) {
  const sides = parseInt(args, 10) || 6;
  const result = Math.floor(Math.random() * sides) + 1;
  return `Rolled a ${sides}-sided die: ${result}`;
}
```

```javascript
// src/commands/index.js
import { roll } from "./roll.js";

export const COMMANDS = {
  // ...existing commands...
  roll,
};
```

---

## 8. Adding New Components

1. Create a new file in `src/components/<Name>.jsx`.
2. Use functional components with `React` hooks.
3. Follow the naming convention: component files use `PascalCase`, source files in `src/` use `.jsx` extension.
4. Write tests in `src/components/__tests__/<Name>.test.jsx`.
5. Import and use the component in `App.jsx`.

Ink components follow React conventions. Use `useState`, `useEffect`, `useCallback`, and `useRef` as needed. For stable references passed to child components, wrap callbacks with `useCallback`.

---

## 9. Documentation Behavior

Documentation should be driven by **change impact**, not treated as a mandatory step for every implementation.

The question is: "Did this change create knowledge that future work needs?"

### Documentation Triggers

Update or suggest documentation for:

- Public API changes
- User-facing behavior changes
- Configuration changes
- Architecture decisions
- New systems or components
- New workflows or conventions

Usually do not document:

- Variable renames
- Internal cleanup
- Small bug fixes with no behavior change
- Temporary experiments

### Role Responsibilities

**Implementer**

- Make code changes
- Update documentation when the need is obvious from the change
- Do not spend excessive effort documenting every edit

**Documenter**

- Specialized role invoked when needed
- Uses diffs, notes, and decisions to create durable documentation
- Focuses on "why" and important behavior, not merely describing code

**Prototyping**

- Produces handoff documentation:
  - Known shortcuts
  - TODOs
  - Refactoring opportunities
  - Unresolved decisions
- See [prototyping-workflow.md](prototyping-workflow.md) for the full prototyping lifecycle.

---
