---
title: "Node.js Style Guidelines"
tags: [nodejs, javascript, style-guide, coding-standards, best-practices]
topics: [naming, comments, spacing, structure, patterns]
keywords: [node.js, javascript, naming-conventions, jsdoc, async-await, error-handling, indentation]
summary: "Coding standards for Node.js projects covering naming, comments, spacing, and file structure conventions."
llm_hints: "Target audience: JavaScript/Node.js developers. Covers naming conventions, comment standards, spacing rules, and file organization used in the Forgekeeper project."
---

# Node.js Style Guidelines

> **Purpose:** Standards and conventions for writing consistent, readable Node.js code. Covers naming, comments, spacing, and file structure.

This section covers the coding standards for all JavaScript/Node.js files in the project.

---


## Table of Contents

- [1. Variable Naming](#1-variable-naming)
- [2. Constants and Immutables](#2-constants-and-immutables)
- [3. Comments](#3-comments)
- [4. Spacing and Indentation](#4-spacing-and-indentation)
- [5. File Structure](#5-file-structure)
- [6. Imports and Exports](#6-imports-and-exports)

For patterns (functions, async/await, error handling), see [patterns.md](patterns.md).

---


## 1. Variable Naming

Conventions for naming variables in the project.

### 1.1 camelCase for Variables and Functions

- Use `camelCase` for regular variables, functions, and method names.
- The name should be a descriptive verb (for functions) or noun (for variables).

```javascript
// Correct
const userName = "Alice";
function calculateTotal() { ... }

// Incorrect
const user_name = "Alice";
function calculate_total() { ... }
```

### 1.2 PascalCase for Classes and Components

- Use `PascalCase` for classes, Vue components, and constructors.

```javascript
class ChatClient { ... }
export default function App() { ... }
```

### 1.3 UPPER_SNAKE_CASE for Constants

- Use `UPPER_SNAKE_CASE` for module-level constants and configuration values.

```javascript
const API_BASE_URL = "http://127.0.0.1:8080";
const MAX_TOKENS = 4096;
const DEFAULT_ROLE = "You are a software engineer.";
```

### 1.4 Avoid Single-Character Names

- Use descriptive names. Avoid `i`, `j`, `k` except in short loops.
- Avoid ambiguous abbreviations: `msg` → `message`, `usr` → `user`, `cfg` → `config`.

---


## 2. Constants and Immutables

Rules for defining constants and immutable values.

### 2.1 Prefer `const` by Default

- Use `const` for all variables that are not reassigned.
- `const` prevents accidental reassignment and makes intent clear.

```javascript
// Correct
const messages = [];
const settings = await loadSettings();

// Incorrect
let messages = [];
var settings = await loadSettings();
```

### 2.2 Use `let` Only for Reassignment

- Use `let` when a variable must be reassigned (e.g., counters, accumulators).
- If only mutation occurs (push, splice, property assignment), `const` is still preferred.

```javascript
// Correct: mutation only, no reassignment
const results = [];
results.push(item);

// Correct: actual reassignment needed
let total = 0;
total += item.value;
```

### 2.3 Never Use `var`

- `var` has function scoping and hoisting behavior that causes bugs.
- It is deprecated in modern codebases.

---


## 3. Comments

Guidelines for writing effective code comments.

### 3.1 Inline Comments

- Use `//` for brief inline comments on the same line.
- Keep inline comments concise and focused on "why", not "what".

```javascript
const newMessages = [...messages, { role: "user", text }];
setMessages(newMessages);  // Immediate UI update before awaiting response
```

### 3.2 Section Header Comments

- Add `//` comments above logical sections to mark purpose.

```javascript
// Error handling: catch API errors and display user-facing message
try {
  const response = await chat(newMessages, settings);
  ...
} catch (err) {
  ...
}
```

### 3.3 JSDoc for Public APIs

- Use JSDoc for exported functions, classes, and complex internal functions.
- Include `@param`, `@returns`, and a one-line description.

```javascript
/**
 * Sends messages to the LLM API and returns the assistant response.
 * @param {Array} messages - Array of { role, text } message objects.
 * @param {Object} settings - Settings object with optional `role` field.
 * @returns {Promise<string>} The assistant's response text.
 */
export async function chat(messages, settings) { ... }
```

### 3.4 Comments Should Explain Why, Not What

- Code should be self-explanatory. Comments add context that code cannot express.
- Do not comment obvious code.

```javascript
// Correct: explains the reasoning
const response = await chat([{ role: "user", text }], settings);  // Pass user message directly to avoid stale closure

// Incorrect: restates the code
// Call the chat function with the user's message
const response = await chat([{ role: "user", text }], settings);
```

---


## 4. Spacing and Indentation

Code formatting rules for spacing.

### 4.1 Two-Space Indentation

- Use 2 spaces for indentation. Never use tabs.

```javascript
// Correct
function example() {
  if (condition) {
    doSomething();
  }
}
```

### 4.2 Spaces Around Operators

- Add a single space around binary operators (`=`, `+`, `-`, `===`, `&&`, `||`, etc.).
- No spaces around unary operators (`!`, `++`, `--`).

```javascript
// Correct
const total = a + b;
if (x === 0 && y > 0) { ... }

// Incorrect
const total=a+b;
if(x===0&&y>0){...}
```

### 4.3 Blank Lines

- Use one blank line to separate logical blocks within a function.
- Use two blank lines before top-level `import` statements that group related imports.

```javascript
const response = await fetch(url);

if (!response.ok) {
  throw new Error(`API error: ${response.status}`);
}

const data = await response.json();
```

### 4.4 Object and Array Literals

- Add a space after `{` and before `}` only for multi-line literals.
- Comma-first or trailing-comma style: use trailing commas (they prevent merge conflicts).

```javascript
const config = {
  model: "qwen",
  max_tokens: 4096,
  top_p: 1,
};

const messages = [
  { role: "system", content: systemPrompt },
  { role: "user", content: text },
];
```

### 4.5 Function Calls

- No space between function name and `(`. One space after each `,` argument.

```javascript
// Correct
chat(messages, settings);
fetch(url, { method: "POST" });

// Incorrect
chat( messages, settings );
fetch( url , { method: "POST" } );
```

---


## 5. File Structure

Organizational structure for project files.

### 5.1 File Naming

- Use lowercase with hyphens: `chat-client.js`, `error-handler.js`.
- Keep filenames descriptive but concise (max ~40 characters).
- Use `.js` extension (not `.jsx` unless it contains JSX).

### 5.2 Directory Organization by Feature

- Group files by feature or concern: `api/`, `components/`, `commands/`, `utils/`.
- Keep related files together (e.g., `api/llm.js` alongside `api/__tests__/llm.test.js`).

### 5.3 Single Responsibility

- Each file should have one clear purpose. If a file grows beyond ~150 lines, consider splitting.
- One exported function/class per file unless there is a clear cohesive relationship.

### 5.4 Index Files

- Use `index.js` only for re-exporting from a directory barrel. Avoid barrel files for small projects.

---


## 6. Imports and Exports

Module import and export conventions.

### 6.1 Import Ordering

- Group imports: built-in modules first, then third-party, then internal (project) modules.
- Add a blank line between groups.

```javascript
import { ref, computed } from "vue";

import fetch from "node-fetch";

import ChatScreen from "./components/ChatScreen.vue";
import { loadConfig } from "./config/prompts.yml";
import { chat } from "../server.js";
```

### 6.2 Named Exports for Utility Functions

- Prefer named exports for functions and constants. It enables tree-shaking and makes refactoring easier.

```javascript
// Correct
export async function chat(messages, settings) { ... }
export function loadSettings() { ... }

// Acceptable (single default export for entry points)
export default function App() { ... }
```

### 6.3 Avoid Wildcard Imports

- Never use `import * as X from "module"`. Import only what you need.

---
