---
title: "Architecture"
tags: [architecture, system-design, overview]
topics: [components, data-flow, context-management, llm-integration]
keywords: [architecture, system-design, ink, react, anthropic, context-pruning, agents.md]
summary: "High-level system architecture of Forgekeeper, covering components, data flow, context management, and LLM integration."
llm_hints: "Target audience: developers joining the project or anyone needing to understand the system layout. Covers the component hierarchy, message flow, context pruning strategy, and how the LLM proxy integrates."
---

# Architecture

> **Purpose:** Overview of the Forgekeeper system architecture, including component layout, data flow, context management, and LLM integration.

This document provides a high-level understanding of how Forgekeeper is structured and how its components interact.

---

## Table of Contents

- [1. Component Overview](#1-component-overview)
- [2. Data Flow](#2-data-flow)
- [3. Context Management](#3-context-management)
- [4. LLM Integration](#4-llm-integration)
- [5. Command System](#5-command-system)
- [6. Roles and Workflows](#6-roles-and-workflows)
- [7. Project Structure](#7-project-structure)

---

## 1. Component Overview

Forgekeeper is organized into four main layers:

### Entry Point

- `bin/forgekeeper.js` - CLI entry script, invoked by the `forgekeeper` npm bin command.
- `src/index.jsx` - Renders the React app using Ink.

### UI Layer

- `src/components/App.jsx` - Main application component. Manages state for messages, loading, token usage, and agents.md warnings. Handles user input submission and command dispatch.
- `src/components/ChatScreen.jsx` - Presentational component that renders the chat interface, message history, and input area.

### API Layer

- `src/api/llm.js` - LLM communication module. Handles:
  - Loading `agents.md` from the project root
  - Token estimation using the Anthropic tokenizer
  - Formatting messages for the OpenAI-compatible API
  - Sending requests to the local proxy at `http://127.0.0.1:8080`

### Command Layer

- `src/commands/index.js` - Command registry and dispatcher. Routes `/` commands to their handlers.
- `src/commands/echoi.js` - Echo test message command.
- `src/commands/passthrough.js` - Passthrough test command.

### Configuration Layer

- `src/settings.js` - Manages user settings stored in `~/.forgekeeper/settings.json`. Loads default role if no config exists.

---

## 2. Data Flow

```
User input
    |
    v
App.jsx (handleSubmit)
    |
    +-- Check agents.md size (first message only)
    |
    +-- Call chat() in api/llm.js
    |        |
    |        +-- Load agents.md
    |        +-- Build system prompt (role + agents.md)
    |        +-- Format messages for API
    |        +-- POST to http://127.0.0.1:8080/v1/chat/completions
    |        +-- Return assistant response
    |
    +-- Update messages state with response
    +-- Estimate token usage
    +-- Render in ChatScreen
```

Commands follow a separate path:

```
User types /command
    |
    v
App.jsx (handleCommand)
    |
    +-- Dispatch to commands/index.js
           |
           +-- Route to command handler
           +-- Return response string
           +-- Add to messages state
```

---

## 3. Context Management

Forgekeeper manages conversation context with two key mechanisms:

### Token Estimation

- Uses the `@anthropic-ai/tokenizer` library for accurate token counting.
- Falls back to a character / 4 heuristic if the tokenizer is unavailable.
- Token usage is displayed in the UI after each response.

### Agents.md Integration

- `agents.md` is loaded from the project root at startup and on the first user message.
- Content is truncated to 10,000 characters (`AGENTS_MD_MAX_CHARS`).
- A warning is shown if `agents.md` exceeds 10,000 characters on first interaction.
- The `loadAgentsMd()` function safely returns an empty string if the file does not exist.

### Context Limit

- The context window is fixed at 64,000 tokens (`CONTEXT_LIMIT`).
- Token usage is tracked and displayed after each exchange.

### Tool Cost System

`cost` represents **context/information cost**, not execution time. Tools are exposed as MCPs and each has an associated cost.

Key principles:

- Encourage cheaper tool combinations
- Prefer searching with `rg` before reading files; retrieve only relevant sections
- `cost` is a design concept to guide efficient tool usage

Example:

```json
{
  "name": "rg",
  "cost": 1,
  "description": "Search project"
}
```

### Tool Output Normalizer

Tools should not blindly dump output into the LLM context. Instead, output passes through a normalizer:

```
Tool
  ↓
Normalizer
  ↓
Summary
  ↓
LLM
```

Examples:

- Tests return pass/fail summaries + failures, not success padding
- Git diff returns relevant summaries first
- Large files should be expandable on demand

Interface:

```ts
{
  summary: "...",
  details: optional
}
```

### Prompt Caching Strategy

Avoid constantly changing the initial/system prompt to preserve cache efficiency.

Preferred structure:

**Static cached prompt** contains:

- Forgekeeper initial prompt
- Available roles
- Tool protocol
- General rules

**Per-request overlay** contains:

```
Current role: IMPLEMENTER
Task: ...
```

This preserves cache efficiency while allowing per-request role and task specification.

### Context Pruning Rules

Pruning preserves important knowledge while removing low-value content.

Rules:

- Preserve core system messages
- Preserve current role and most recent starting role
- Remove old tool output
- Remove superseded role declarations

### Message Structure

Messages carry `forgekeeper` metadata alongside standard LLM message fields:

```json
{
  "role": "user",
  "content": "Investigate terrain movement bug",
  "forgekeeper": {
    "role": "advisor"
  }
}
```

Role transitions use explicit metadata:

```json
{
  "role": "user",
  "content": "Implement the change",
  "forgekeeper": {
    "role_transition": {
      "from": "advisor",
      "to": "implementer"
    }
  }
}
```

---

## 4. LLM Integration

Forgekeeper connects to a local LLM proxy rather than a cloud API directly.

### Proxy Configuration

- **Base URL**: `http://127.0.0.1:8080`
- **Model**: `qwen`
- **API endpoint**: `/v1/chat/completions` (OpenAI-compatible format)

### Request Format

```
POST /v1/chat/completions
Content-Type: application/json

{
  "model": "qwen",
  "messages": [
    { "role": "system", "content": "<system prompt>" },
    { "role": "user", "content": "<user message>" },
    ...
  ],
  "max_tokens": 4096,
  "top_p": 1
}
```

### Response Handling

- Extracts `data.choices[0].message.content`.
- Returns `[No response]` if the response is empty.
- Throws a descriptive error for non-OK HTTP responses.
- 120-second timeout via `AbortSignal.timeout()`.

---

## 5. Command System

### Registry

Commands are registered in `COMMANDS` object in `src/commands/index.js`.

| Command | Handler | Description |
|---------|---------|-------------|
| `/help` | `help()` | Lists available commands |
| `/settings` | `settings()` | Opens settings editor (placeholder) |
| `/echoi <text>` | `echoi(args)` | Echoes test message |
| `/passthrough <text>` | `passthrough(args)` | Passthrough test message |

### Dispatch

`dispatchCommand(name, args)` looks up the handler by name and invokes it. Unknown commands return `[unknown command: /<name>]`.

---

## 6. Roles and Workflows

For agent roles (advisor, architect, implementer, reviewer), prototyping workflow, coding workflow, role switching, and session management, see [roles-and-workflows.md](roles-and-workflows.md).

---

## 7. Project Structure

```
root/
├── bin/
│   └── forgekeeper.js          # CLI entry point
├── docs/
│   ├── architecture.md          # This file
│   ├── development-guide.md     # Developer setup and workflow
│   ├── roles-and-workflows.md   # Agent roles and workflows
│   ├── prototyping-workflow.md  # Prototyping lifecycle
│   ├── configuration.md         # Settings and agents.md reference
│   ├── style-guidelines.md      # Node.js coding standards
│   ├── patterns.md              # Async, error handling, file structure
│   ├── notes-system.md          # Notes system reference
│   ├── markdown-best-practices.md  # RAG-optimized markdown rules
│   ├── rag-guidelines.md        # RAG-specific guidelines
│   ├── markdown-syntax.md       # Markdown syntax reference
│   └── roadmap.md               # Planned features and TODOs
├── src/
│   ├── api/
│   │   ├── llm.js               # LLM communication module
│   │   └── __tests__/
│   │       └── llm.test.js
│   ├── commands/
│   │   ├── index.js             # Command registry and dispatcher
│   │   ├── echoi.js             # Echo test command
│   │   ├── passthrough.js       # Passthrough test command
│   │   └── __tests__/
│   ├── components/
│   │   ├── App.jsx              # Main app component
│   │   ├── ChatScreen.jsx       # Chat UI component
│   │   └── __tests__/
│   ├── index.jsx                # Ink renderer entry
│   └── settings.js              # User settings module
├── agents.md                    # AI agent instructions (project root)
├── package.json
└── README.md
```

---
