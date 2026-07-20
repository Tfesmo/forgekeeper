---
title: "Configuration"
tags: [configuration, settings, agents.md, setup]
topics: [settings-schema, agents-format, environment]
keywords: [settings, agents.md, forgekeeper-config, role-prompt, token-limit]
summary: "Reference for Forgekeeper configuration: settings.json schema, agents.md format, and environment setup."
llm_hints: "Target audience: users and developers configuring Forgekeeper. Covers the settings file schema, agents.md structure, and how to customize the LLM integration."
---

# Configuration

> **Purpose:** Reference for Forgekeeper configuration including the settings file schema, agents.md format, and environment setup.

This document covers all configuration options and files that Forgekeeper uses.

---

## Table of Contents

- [1. User Settings](#1-user-settings)
- [2. Agents.md](#2-agentsmd)
- [3. LLM Proxy Configuration](#3-llm-proxy-configuration)
- [4. Markdown Best Practices](#4-markdown-best-practices)

---

## 1. User Settings

### Location

`~/.forgekeeper/settings.json`

The directory is created automatically on first run if it does not exist.

### Schema

| Field | Type   | Required | Default | Description |
|-------|--------|----------|---------|-------------|
| `role` | string | no | `"You are a software engineer and competent technical document writer."` | System role prompt sent to the LLM with every request |

### Example

```json
{
  "role": "You are an expert TypeScript developer focused on clean architecture."
}
```

### Loading Behavior

- If `settings.json` does not exist or fails to parse, the default role is used.
- The settings object is loaded once at app startup and cached in a `useRef`.
- The `saveSettings()` function writes formatted JSON (2-space indentation).

---

## 2. Agents.md

### Location

`agents.md` in the project root (the directory from which Forgekeeper is launched).

### Purpose

`agents.md` is loaded at startup and prepended to the system prompt. It provides instructions, guidelines, and context to the LLM agent.

### Structure

Use standard Markdown with the following conventions:

- **H1 heading**: Document title (e.g., `# Project Name Guidelines`)
- **Sections**: Use `##` for top-level sections, `###` for subsections.
- **Lists**: Use `-` for unordered lists, `1.` for ordered lists.
- **YAML frontmatter**: Optional, but recommended for RAG pipelines (see [markdown-best-practices.md](markdown-best-practices.md)).

### Size Limit

- Content is truncated to 10,000 characters (`AGENTS_MD_MAX_CHARS`).
- A warning is shown to the user if `agents.md` exceeds this limit on the first message.
- For large instruction sets, split into smaller files and reference them.

### Example

```markdown
# Forgekeeper Development Guidelines

## AI Agent Instructions

- Always reply in English.
- If a requested change requires significant architectural changes, stop and explain the options.

## Development Workflow

1. Understand the existing implementation.
2. Produce the smallest change.
3. Run tests.
4. Refactor only after behavior is correct.
```

### Referenced Documentation

- See [markdown-best-practices.md](markdown-best-practices.md) for RAG-optimized markdown rules.
- See [markdown-syntax.md](markdown-syntax.md) for syntax reference.
- See [style-guidelines.md](style-guidelines.md) for Node.js coding standards.

---

## 3. LLM Proxy Configuration

### Current Configuration

| Setting | Value | Location |
|---------|-------|----------|
| API Base URL | `http://127.0.0.1:8080` | `src/api/llm.js` |
| Model | `qwen` | `src/api/llm.js` |
| Endpoint | `/v1/chat/completions` | `src/api/llm.js` |
| Max Tokens | 4096 | `src/api/llm.js` |
| Timeout | 120 seconds | `src/api/llm.js` |

### Proxy Requirements

The proxy must:

- Expose an OpenAI-compatible `/v1/chat/completions` endpoint.
- Support the model specified in `MODEL` (currently `qwen`).
- Accept JSON body with `model`, `messages`, `max_tokens`, and `top_p` fields.

### Common Proxy Options

- **Ollama**: `ollama serve` exposes a compatible API on port 11434 by default. Update `API_BASE` in `src/api/llm.js` to point to it.
- **LM Studio**: Runs a local server with OpenAI-compatible API.
- **vLLM**: High-throughput serving for open models.

To change the proxy URL or model, edit the constants in `src/api/llm.js`.

---

## 4. Markdown Best Practices

When writing `agents.md` or any Markdown documentation in the project, follow the rules in:

- [markdown-best-practices.md](markdown-best-practices.md) - RAG-optimized writing and structure rules.
- [markdown-syntax.md](markdown-syntax.md) - Markdown syntax reference.

---
