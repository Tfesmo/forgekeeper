---
title: "Configuration"
tags: [configuration, settings, agents.md, setup]
topics: [settings-schema, agents-format, environment]
keywords: [settings, agents.md, forgekeeper-config, mode-prompt, token-limit]
summary: "Reference for Forgekeeper configuration: settings.json schema, agents.md format, and environment setup."
llm_hints: "Target audience: users and developers configuring Forgekeeper. Covers the settings file schema, agents.md structure, and how to customize the LLM integration."
---

# Configuration

> **Purpose:** Reference for Forgekeeper configuration including the settings file schema, agents.md format, and environment setup.

This document covers all configuration options and files that Forgekeeper uses.

---


## Table of Contents

- [1. User Settings](#1-user-settings)
- [2. System Prompt Config](#2-system-prompt-config)
- [3. Agents.md](#3-agentsmd)
- [4. LLM Proxy Configuration](#4-llm-proxy-configuration)

---


## 1. User Settings

User settings in `~/.forgekeeper/settings.json` are no longer used. Configuration has been consolidated into server-side files.

### Server-Side Mode Configuration

The default mode prompt is defined in `src/config/prompts.yml` (see System Prompt Config below). To change the mode, edit the system prompt directly in that file.

### Forgekeeper Metadata

User messages always include a `forgekeeper` metadata field injected by the Vue frontend:

```json
{
  "role": "user",
  "content": "Analyze this code",
  "forgekeeper": {
    "mode": "analyst"
  }
}
```

This field is stripped by the Express server before sending to the LLM. It is used by the server-side message formatting logic to:
- Detect mode assignments on first non-system message
- Detect mode transitions between consecutive forgekeeper messages
- Inject `[Mode: analyst]` or `[Mode Transition: analyst → implementer]` labels

---


## 2. System Prompt Config

Configuration for the system prompt behavior.

### Location

`src/config/prompts.yml`

### Purpose

Defines the static system prompt that forms the base identity and rules for all agent interactions. This file is loaded at startup and merged with any existing system messages in conversation history.

### Structure

YAML format with a `systemPrompt` field:

```yaml
systemPrompt: |
  You are an expert software engineer and competent technical writer.

  Available roles:
  - analyst: Investigation, code review, debugging
  - implementer: Building, modifying code, writing tests

  When role is not specified, default to analyst.
  ...
```

### Loading Behavior

- Loaded by `src/server.js` at startup using `js-yaml`.
- The system prompt is merged with `agents.md` content and any workflow overlays.
- Existing system messages in conversation history are preserved — the config prompt is prepended to them.

### Key Sections

- **Base identity**: Core mode description (e.g., "You are an expert software engineer...")
- **Available modes**: JSON list of mode names and descriptions
- **Mode switching instructions**: How the agent should handle mode transitions
- **Tool protocol**: Guidelines for using MCP tools

---


## 3. Agents.md

Settings and behavior for agent configuration files.

### Location

`agents.md` in the project root (the directory from which Forgekeeper is launched).

### Purpose

`agents.md` is loaded at startup and prepended to the system prompt. It provides instructions, guidelines, and context to the LLM agent.

### Structure

Use standard Markdown with the following conventions:

- **H1 heading**: Document title (e.g., `# Project Name Guidelines`)
- **Sections**: Use `##` for top-level sections, `###` for subsections.
- **Lists**: Use `-` for unordered lists, `1.` for ordered lists.
- **YAML frontmatter**: Optional, but recommended for RAG pipelines (see [rag-guidelines.md](rag-guidelines.md)).

### Size Limit

- agents.md content is truncated to 10,000 characters (`AGENTS_MD_MAX_CHARS`).
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

- See [rag-guidelines.md](rag-guidelines.md) for RAG-optimized markdown rules.
- See [markdown-syntax.md](markdown-syntax.md) for syntax reference.
- See [style-guidelines.md](style-guidelines.md) for Node.js coding standards.
- See [notes-system.md](notes-system.md) for the notes system reference.

---


## 4. LLM Proxy Configuration

Setup and configuration for the LLM proxy layer.

### Current Configuration

| Setting | Value | Location |
|---------|-------|----------|
| API Base URL | `http://127.0.0.1:8080` | `src/server.js` |
| Model | `qwen` | `src/server.js` |
| Endpoint | `/v1/chat/completions` | `src/server.js` |
| Max Tokens | 4096 | `src/server.js` |
| Timeout | 120 seconds | `src/server.js` |

### Proxy Requirements

The proxy must:

- Expose an OpenAI-compatible `/v1/chat/completions` endpoint.
- Support the model specified in `MODEL` (currently `qwen`).
- Accept JSON body with `model`, `messages`, `max_tokens`, and `top_p` fields.

### Common Proxy Options

- **Ollama**: `ollama serve` exposes a compatible API on port 11434 by default. Update `API_BASE` in `src/server.js` to point to it.
- **LM Studio**: Runs a local server with OpenAI-compatible API.
- **vLLM**: High-throughput serving for open models.

To change the proxy URL or model, edit the constants in `src/server.js`.

---
