---
title: "Node.js Best Practices"
tags: [node, express, best-practices, backend, server-side, javascript]
topics: [style-guidelines, architecture, error-handling, security, performance, testing]
keywords: [node, express, es-modules, async-await, error-handling, dotenv, security, helmet, rate-limiting, joi, zod, pino, winston, testing, vitest]
summary: "Rules for writing and structuring Node.js backend applications. Covers style guidelines, architecture, error handling, security, performance, and testing."
llm_hints: "Target audience: backend developers building Node.js/Express applications. Covers ES modules, async patterns, security middleware, validation, and testing strategies."
---

# Node.js Best Practices (2026)

Rules for writing and structuring Node.js backend applications. Covers style guidelines, architecture, error handling, security, performance, and testing.

---


## Table of Contents

- [1. Style Guidelines](#1-style-guidelines)
- [2. Architecture & Organization](#2-architecture--organization)
- [3. Error Handling](#3-error-handling)
- [4. Security](#4-security)
- [5. Performance](#5-performance)
- [6. Testing](#6-testing)
- [7. Patterns to Avoid](#7-patterns-to-avoid)

---


## 1. Style Guidelines

This section covers module style, naming conventions, and code organization.

### 1.1 ES Modules

- **Use ES modules** (`import`/`export`) rather than `require()`. ES modules are the Node.js standard and enable static analysis and tree-shaking.
- **Named exports over default exports**: Prefer named exports for better refactoring and static analysis (`export function foo() {}` rather than `export default foo`).
- **Use `fileURLToPath`**: When needing `__dirname` or `__filename` in ES modules, use `fileURLToPath(import.meta.url)`.

### 1.2 Naming Conventions

- **File naming**: Use kebab-case for files (e.g., `auth-controller.js`, `token-utils.js`).
- **Variable naming**: Use camelCase for variables and functions, PascalCase for classes and exported constructors.
- **Constants**: Use UPPER_SNAKE_CASE for module-level constants (e.g., `MAX_TOKENS`, `API_BASE`).
- **Environment variables**: Prefix with a namespace (e.g., `SERVER_PORT`, `API_SECRET`). Use `process.env.X ?? defaultValue` for defaults.

### 1.3 Server Setup Order

```javascript
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

const app = express();

// 1. Security middleware (helmet, cors)
app.use(helmet());

// 2. Rate limiting
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// 3. Body parsing (with size limits)
app.use(express.json({ limit: "1mb" }));

// 4. Static assets
app.use("/assets", express.static("public"));

// 5. Routes
app.use("/api", apiRoutes);

// 6. Error-handling middleware (last)
app.use(errorHandler);
```

---


## 2. Architecture & Organization

This section covers routing, separation of concerns, and project structure.

### 2.1 Separation of Concerns

Split server logic into layers rather than keeping everything in route handlers:

- **Routes** (`routes/`): Define endpoints, parse requests, call controllers.
- **Controllers** (`controllers/`): Handle request/response, call services.
- **Services** (`services/`): Business logic, database access, external API calls.
- **Models** (`models/`): Data schemas and database operations.
- **Middleware** (`middleware/`): Cross-cutting concerns (auth, validation, logging).
- **Utils** (`utils/`): Pure helper functions.

### 2.2 Route Organization

Group routes by domain. Use Express Router for modular route definitions:

```javascript
// routes/chat.js
import { Router } from "express";
import { chatController } from "../controllers/chatController.js";

const router = Router();
router.post("/", chatController.create);
router.get("/status", chatController.status);
export default router;
```

### 2.3 In-Memory Stores

For simple apps, an in-memory `Map` or object is fine (as in `server.js`). For production or multi-user scenarios, use a persistent store (Redis, database) with TTLs for session data. Always consider concurrent access and memory limits.

---


## 3. Error Handling

This section covers async error handling, custom errors, and Express error middleware.

### 3.1 Async Error Handling

- **Always `await` promises with try/catch**. Never leave an async IIFE fire-and-forget without a catch:

```javascript
// Bad: fire-and-forget async with no error boundary
(async () => {
  await fetch(url);
})();

// Good: attach a catch
(async () => {
  try {
    await fetch(url);
  } catch (err) {
    logger.error("Background task failed", err);
  }
})();
```

### 3.2 Custom Error Classes

Create domain-specific error classes for clearer error handling:

```javascript
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400, "VALIDATION_ERROR");
  }
}
```

### 3.3 Express Error Middleware

Define a single error-handling middleware as the last route in your app:

```javascript
function errorHandler(err, req, res, _next) {
  const statusCode = err.statusCode ?? 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
}
```

- **Never leak stack traces or internal details to clients** in production.
- **Log errors** with a structured logger (Pino or Winston) before responding.

---


## 4. Security

This section covers input validation, security headers, rate limiting, and secret management.

### 4.1 Environment Variables & Secrets

- **Never hardcode secrets** in source code. Use environment variables or a secret manager.
- **Use `dotenv` for local development only** — load it conditionally:

```javascript
if (process.env.NODE_ENV !== "production") {
  await import("dotenv/config");
}
```

- **Validate required variables** at startup, failing fast if missing:

```javascript
const API_KEY = process.env.API_KEY;
if (!API_KEY) throw new Error("API_KEY is required");
```

### 4.2 Input Validation

Validate all user input. Use a validation library:

- **Zod** (recommended for TypeScript/JS with schema inference) or **Joi** for request body/query/parameter validation.
- **Validate before business logic** runs, returning 400 with clear error messages.

```javascript
import { z } from "zod";

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.string(), text: z.string() })),
  role: z.string().optional(),
});

app.post("/api/chat", (req, res, next) => {
  const result = chatSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.message });
  }
  next();
});
```

### 4.3 Security Headers & Rate Limiting

- **Helmet**: Sets security headers (HSTS, X-Frame-Options, CSP, etc.).
- **Rate limiting**: Apply `express-rate-limit` to all API routes to prevent abuse.
- **CORS**: Use `cors` middleware to restrict which origins can access your API.
- **HTTPS**: Always serve over HTTPS in production. Redirect HTTP → HTTPS.

### 4.4 External Requests

When making outbound requests:

- **Set timeouts** using `AbortSignal.timeout()`.
- **Validate and sanitize URLs** — prevent SSRF attacks by restricting to allow-lists where possible.
- **Parse response bodies safely** — handle non-JSON responses and oversized bodies.

```javascript
const response = await fetch(url, {
  signal: AbortSignal.timeout(10_000),
  headers: { "User-Agent": "MyApp/1.0" },
});
```

---


## 5. Performance

This section covers connection management, streaming, and memory efficiency.

### 5.1 Connection Pooling

For database connections, use connection pooling. Don't create new connections per request.

### 5.2 Streaming for Large Data

When serving large responses or processing large files, use streams instead of loading everything into memory:

```javascript
import fs from "node:fs";
import path from "node:path";

app.get("/download/:file", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.file);
  const stream = fs.createReadStream(filePath);
  stream.pipe(res);
});
```

### 5.3 Avoid Blocking the Event Loop

- **No synchronous file I/O** in request handlers — use async `fs.promises` or streams.
- **Offload heavy CPU work** to worker threads or a task queue (Bull, RabbitMQ).
- **Cache repeated computations** using `Map` with TTL or Redis.

---


## 6. Testing

This section covers unit testing, integration testing, and mocking.

### 6.1 Unit Testing

- **Test business logic** (services, utils) in isolation using **Vitest**.
- **Mock external dependencies** (databases, HTTP clients, file system) with `vi.fn()` or library mocks.

### 6.2 Integration Testing

- **Test route handlers** with a test HTTP client (e.g., `supertest`).
- **Spin up a test server** for each test suite with a clean database/fixtures.

```javascript
import request from "supertest";
import app from "../src/app.js";

describe("POST /api/chat/stream", () => {
  it("returns 400 for empty messages", async () => {
    const res = await request(app).post("/api/chat/stream").send({});
    expect(res.status).toBe(400);
  });
});
```

### 6.3 Test Configuration

- Use Vitest with ESM support.
- Configure test environment variables via `vitest.config.js` or `.env.test`.
- Mock `process.env` carefully — avoid mutating it between tests without cleanup.

---


## 7. Patterns to Avoid

This section covers legacy patterns and anti-patterns that should not be used in new development.

- **Callback hell**: Use `async`/`await` instead of nested callbacks.
- **`process.exit()`**: Never call it in request handlers — use graceful shutdown with `server.close()`.
- **`sync` fs operations** in request paths (e.g., `fs.readFileSync`, `fs.readdirSync`).
- **Global state in modules** without cleanup — in-memory stores should have TTL-based eviction or a health-check that reports their size.
- **Unbounded request bodies** — always set size limits on `express.json()`.
- **`eval()` or `new Function()`** — dynamic code execution is a security risk.
- **Hardcoded ports/URLs** — use environment variables for configuration.
- **Unhandled promise rejections** — add a global handler: `process.on("unhandledRejection", ...)` in development.
