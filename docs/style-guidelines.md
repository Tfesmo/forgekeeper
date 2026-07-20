---
title: "Node.js Style Guidelines"
tags: [nodejs, javascript, style-guide, coding-standards, best-practices]
topics: [naming, comments, spacing, structure, patterns]
keywords: [node.js, javascript, naming-conventions, jsdoc, async-await, error-handling, indentation]
summary: "Coding standards and best practices for Node.js projects covering naming, comments, spacing, file structure, and common patterns."
llm_hints: "Target audience: JavaScript/Node.js developers. Covers naming conventions, comment standards, spacing rules, file organization, async patterns, and error handling conventions used across modern Node.js codebases."
---

# Node.js Style Guidelines

> **Purpose:** Standards and conventions for writing consistent, readable Node.js code. Covers naming, comments, spacing, file structure, async patterns, and error handling.

This section covers the coding standards for all JavaScript/Node.js files in the project.

---

## Table of Contents

- [1. Variable Naming](#1-variable-naming)
- [2. Constants and Immutables](#2-constants-and-immutables)
- [3. Comments](#3-comments)
- [4. Spacing and Indentation](#4-spacing-and-indentation)
- [5. Functions](#5-functions)
- [6. Async/Await](#6-asyncawait)
- [7. Error Handling](#7-error-handling)
- [8. File Structure](#8-file-structure)
- [9. Imports and Exports](#9-imports-and-exports)
- [10. Validation Checklist](#10-validation-checklist)

---

## 1. Variable Naming

This section covers naming conventions for variables, functions, classes, and constants.

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

- Use `PascalCase` for classes, React components, and constructors.

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

This section covers when to use `const`, `let`, and why `var` is forbidden.

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

This section covers comment style, JSDoc usage, and when to add comments.

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

This section covers indentation, blank lines, operator spacing, and object formatting.

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

## 5. Functions

This section covers function declaration style, arrow functions, and method organization.

### 5.1 Arrow Functions for Callbacks and Short Functions

- Use arrow functions for callbacks, short expressions, and component functions.

```javascript
setMessages((prev) => [...prev, { role: "user", text }]);

const calculateTotal = (items) => items.reduce((sum, item) => sum + item.price, 0);
```

### 5.2 Named Function Declarations for Complex Logic

- Use `function` declarations for larger, named functions that benefit from hoisting and stack traces.

```javascript
function formatResponse(data) {
  const { choices } = data;
  if (!choices?.length) return "[No response]";
  return choices[0]?.message?.content || "[No response]";
}
```

### 5.3 `useCallback` for React Stable References

- Wrap callbacks passed to child components or used in `useEffect`/`useCallback` deps with `useCallback`.
- Include all dependencies in the dependency array.

```javascript
const handleSubmit = useCallback(async (text) => {
  const newMessages = [...messages, { role: "user", text }];
  setMessages(newMessages);
  // ...
}, [messages, settings]);
```

### 5.4 Avoid Deeply Nested Callbacks

- Flatten nested logic. If indentation goes deeper than 3 levels, extract into a named function.

---

## 6. Async/Await

This section covers async function patterns, error handling, and concurrency.

### 6.1 Use `async`/`await` Over `.then()` Chains

- `async`/`await` is more readable and allows standard `try`/`catch` error handling.

```javascript
// Correct
const data = await fetchJSON(url);
const result = await processData(data);

// Incorrect
fetchJSON(url).then((data) => processData(data).then((result) => ...));
```

### 6.2 Top-Level `await` in ESM

- Use top-level `await` in ES modules for initialization logic (e.g., loading config at module scope).

### 6.3 Parallel Independent Operations

- Use `Promise.all()` for independent async operations that can run concurrently.

```javascript
const [settings, userData] = await Promise.all([
  loadSettings(),
  fetchUser(id),
]);
```

### 6.4 Always Wrap `await` Calls in `try`/`catch`

- Never leave an `await` call unhandled.

```javascript
try {
  const response = await chat(messages, settings);
  setMessages((prev) => [...prev, { role: "assistant", text: response }]);
} catch (err) {
  setMessages((prev) => [
    ...prev,
    { role: "assistant", text: `[Error: ${err.message}]` },
  ]);
}
```

---

## 7. Error Handling

This section covers error patterns, error messages, and error types.

### 7.1 Throw Specific Error Types

- Use built-in error types (`TypeError`, `RangeError`, `SyntaxError`) or create custom error classes.
- Avoid throwing plain strings or numbers.

```javascript
throw new TypeError("Expected messages to be an array of { role, text } objects");
```

### 7.2 User-Facing vs Internal Errors

- Internal errors: include technical details (stack traces, status codes).
- User-facing messages: brief, actionable, no stack traces or internal paths.

```javascript
// Internal (log this)
console.error(`API request failed: ${response.status} ${response.statusText}`, error.stack);

// User-facing (display this)
{ role: "assistant", text: `[Error: ${err.message}]` }
```

### 7.3 Error Messages Should Be Descriptive

- Include enough context to diagnose the issue without needing the stack trace.

```javascript
// Good
throw new Error(`API error: ${response.status} ${response.statusText}`);

// Bad
throw new Error("Something went wrong");
```

---

## 8. File Structure

This section covers project layout, file naming, and module organization.

### 8.1 File Naming

- Use lowercase with hyphens for filenames: `chat-client.js`, `error-handler.js`.
- Keep filenames descriptive but concise (max ~40 characters).
- Use `.js` extension (not `.jsx` unless it contains JSX).

### 8.2 Directory Organization by Feature

- Group files by feature or concern: `api/`, `components/`, `commands/`, `utils/`.
- Keep related files together (e.g., `api/llm.js` alongside `api/__tests__/llm.test.js`).

### 8.3 Single Responsibility

- Each file should have one clear purpose. If a file grows beyond ~150 lines, consider splitting.
- One exported function/class per file unless there is a clear cohesive relationship.

### 8.4 Index Files

- Use `index.js` only for re-exporting from a directory barrel. Avoid barrel files for small projects.

---

## 9. Imports and Exports

This section covers import ordering, named vs default exports, and module structure.

### 9.1 Import Ordering

- Group imports: built-in modules first, then third-party, then internal (project) modules.
- Add a blank line between groups.

```javascript
import React, { useState, useCallback } from "react";

import fetch from "node-fetch";

import ChatScreen from "./components/ChatScreen.jsx";
import { loadSettings } from "./components/ChatScreen.jsx";
import { chat } from "../api/llm.js";
```

### 9.2 Named Exports for Utility Functions

- Prefer named exports for functions and constants. It enables tree-shaking and makes refactoring easier.

```javascript
// Correct
export async function chat(messages, settings) { ... }
export function loadSettings() { ... }

// Acceptable (single default export for entry points)
export default function App() { ... }
```

### 9.3 Avoid Wildcard Imports

- Never use `import * as X from "module"`. Import only what you need.

---

## 10. Validation Checklist

This section provides a checklist for validating JavaScript/Node.js code before committing.

Every JavaScript file should pass the following checks before committing:

- [ ] No `var` declarations
- [ ] `const` used by default, `let` only when reassignment is needed
- [ ] `camelCase` for variables and functions, `PascalCase` for classes/components
- [ ] `UPPER_SNAKE_CASE` for module-level constants
- [ ] Descriptive variable names (no single-letter names except loop counters)
- [ ] 2-space indentation, no tabs
- [ ] Spaces around binary operators, no spaces around unary operators
- [ ] Trailing commas in multi-line objects and arrays
- [ ] JSDoc for exported functions and complex internal functions
- [ ] Inline comments explain "why", not "what"
- [ ] `async`/`await` used instead of `.then()` chains
- [ ] All `await` calls wrapped in `try`/`catch`
- [ ] Error messages include status codes or context
- [ ] No bare `throw` of strings or numbers
- [ ] Imports grouped (built-in, third-party, internal) with blank lines between groups
- [ ] Named exports preferred for utility functions
- [ ] No deeply nested callbacks (max 3 levels)
- [ ] Files under ~150 lines with a single clear purpose

---
