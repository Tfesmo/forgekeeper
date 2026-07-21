---
title: "Node.js Patterns"
tags: [nodejs, javascript, patterns, async, error-handling]
topics: [functions, async-await, error-handling, file-structure, imports]
keywords: [node.js, patterns, promise-all, try-catch, named-exports]
summary: "Coding patterns for Node.js projects: function declaration, async/await, error handling, imports/exports, and validation."
llm_hints: "Target audience: JavaScript/Node.js developers. Covers function patterns, async/await conventions, error handling, import ordering, and a validation checklist."
---

# Node.js Patterns

> **Purpose:** Patterns and conventions for writing consistent, readable Node.js code. Covers functions, async/await, error handling, imports, exports, and validation.

For naming conventions, comments, spacing, and file structure, see [style-guidelines.md](style-guidelines.md).

---

## Table of Contents

- [1. Functions](#1-functions)
- [2. Async/Await](#2-asyncawait)
- [3. Error Handling](#3-error-handling)
- [4. Imports and Exports](#4-imports-and-exports)
- [5. Validation Checklist](#5-validation-checklist)

---

## 1. Functions

### 1.1 Arrow Functions for Callbacks and Short Functions

- Use arrow functions for callbacks, short expressions, and component functions.

```javascript
setMessages((prev) => [...prev, { role: "user", text }]);

const calculateTotal = (items) => items.reduce((sum, item) => sum + item.price, 0);
```

### 1.2 Named Function Declarations for Complex Logic

- Use `function` declarations for larger, named functions that benefit from hoisting and stack traces.

```javascript
function formatResponse(data) {
  const { choices } = data;
  if (!choices?.length) return "[No response]";
  return choices[0]?.message?.content || "[No response]";
}
```
### 1.4 Avoid Deeply Nested Callbacks

- Flatten nested logic. If indentation goes deeper than 3 levels, extract into a named function.

---

## 2. Async/Await

### 2.1 Use `async`/`await` Over `.then()` Chains

- `async`/`await` is more readable and allows standard `try`/`catch` error handling.

```javascript
// Correct
const data = await fetchJSON(url);
const result = await processData(data);

// Incorrect
fetchJSON(url).then((data) => processData(data).then((result) => ...));
```

### 2.2 Top-Level `await` in ESM

- Use top-level `await` in ES modules for initialization logic (e.g., loading config at module scope).

### 2.3 Parallel Independent Operations

- Use `Promise.all()` for independent async operations that can run concurrently.

```javascript
const [settings, userData] = await Promise.all([
  loadSettings(),
  fetchUser(id),
]);
```

### 2.4 Always Wrap `await` Calls in `try`/`catch`

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

## 3. Error Handling

### 3.1 Throw Specific Error Types

- Use built-in error types (`TypeError`, `RangeError`, `SyntaxError`) or create custom error classes.
- Avoid throwing plain strings or numbers.

```javascript
throw new TypeError("Expected messages to be an array of { role, text } objects");
```

### 3.2 User-Facing vs Internal Errors

- Internal errors: include technical details (stack traces, status codes).
- User-facing messages: brief, actionable, no stack traces or internal paths.

```javascript
// Internal (log this)
console.error(`API request failed: ${response.status} ${response.statusText}`, error.stack);

// User-facing (display this)
{ role: "assistant", text: `[Error: ${err.message}]` }
```

### 3.3 Error Messages Should Be Descriptive

- Include enough context to diagnose the issue without needing the stack trace.

```javascript
// Good
throw new Error(`API error: ${response.status} ${response.statusText}`);

// Bad
throw new Error("Something went wrong");
```

---

## 4. Imports and Exports

### 4.1 Named Exports for Utility Functions

- Prefer named exports for functions and constants. It enables tree-shaking and makes refactoring easier.

```javascript
// Correct
export async function chat(messages, settings) { ... }
export function loadSettings() { ... }

// Acceptable (single default export for entry points)
export default function App() { ... }
```

### 4.2 Avoid Wildcard Imports

- Never use `import * as X from "module"`. Import only what you need.

---

## 5. Validation Checklist

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
