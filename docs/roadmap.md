---
title: "Roadmap"
tags: [roadmap, planning, todo]
topics: [features, status, planned-additions]
keywords: [roadmap, backlog, context-pruning, vector-database, chroma, qdrant]
summary: "Planned features and development roadmap for Forgekeeper, including current status and planned additions."
llm_hints: "Target audience: project maintainer and contributors. Covers planned features, current implementation status, and the backlog of additions."
---

# Roadmap

> **Purpose:** Planned features and development roadmap for Forgekeeper, including current status and planned additions.

This document tracks the current state of the project and planned future work.

---


## Table of Contents

- [1. Current Status](#1-current-status)
- [2. Phased Roadmap](#2-phased-roadmap)
  - [Phase 1: Self-Sufficient](#phase-1-self-sufficient)
  - [Phase 2: Notes](#phase-2-notes)
  - [Phase 3: Polish](#phase-3-polish)
  - [Phase 4: Prototyping](#phase-4-prototyping)
  - [Phase 5: Multi-LLM](#phase-5-multi-llm)
- [3. Backlog](#3-backlog)
- [4. MCP Tools Research](#4-mcp-tools-research)
- [5. Completed](#5-completed)

---


## 1. Current Status

Forgekeeper is in very early development. The core chat interface is functional with:

- Web UI via Vue.js/Express
- LLM integration via OpenAI-compatible proxy
- Token estimation and display
- agents.md system prompt loading
- Test suite skeleton with vitest

---


## 2. Phased Roadmap

Multi-phase implementation roadmap.

### Phase 1: Self-Sufficient

Forgekeeper works independently on its own code without notes.

- [ ] File operations: rg, tree, file reads/edits
- [ ] Web search MCP integration
- [ ] Git tool integration
- [ ] Prune system with configurable thresholds
- [ ] Coding workflow with UI indicator
- [ ] Evaluate performance with no notes enabled

### Phase 2: Notes

Add the notes system and observe behavior in long sessions.

- [ ] Vector DB MCP integration (user-selectable: Chroma, Qdrant, etc.)
- [ ] Session collection management (UUID-based)
- [ ] Canary note on session creation and resume
- [ ] Confidence levels (high, medium, low) for notes
- [ ] A* retrieval pathing
- [ ] Configurable note-writing system prompt instructions
- [ ] Investigate non-LLM note generation

### Phase 3: Polish

Flesh out MCPs, UI, commands, and bug deep dives.

- [ ] Tool cost system (context/information cost per tool)
- [ ] Tool output normalizer (pass/fail summaries, git diff summaries)
- [ ] Prompt caching strategy (static prompt + per-request overlay)
- [ ] Context window usage visualization in the UI
- [ ] Panel system for session notes and debug information
- [ ] Pause/start button to halt agent tool requests
- [ ] Interactive settings editor
- [ ] Session management (list, resume, delete sessions)
- [ ] Configurable LLM proxy URL and model
- [ ] Command history with up/down navigation
- [ ] Context reset monitoring (log-based session banner)
- [ ] Message hash chain (SHA-256 per-message integrity, toggleable)
- [ ] Bug deep dives

### Phase 4: Prototyping

- [ ] Autonomous prototyping workflow

### Phase 5: Multi-LLM

- [ ] Test with other LLMs
- [ ] Check for free cloud options

---


## 3. Backlog

Items not assigned to a phase. Tackle when capacity allows.

- [ ] Multi-agent support (different agents for different tasks)
- [ ] Agent profiles with custom prompts and file references
- [ ] Dynamic agents.md loading based on active agent
- [ ] Inject reminder of user's original request after all pruning events
- [ ] Full test coverage for all modules
- [ ] Integration tests for LLM proxy communication
- [ ] Snapshot tests for UI components
- [ ] API reference for exported functions
- [ ] Contributing guide
- [ ] Architecture diagrams

---


## 4. Completed

List of completed roadmap items.

- [x] Web UI via Vue.js/Express
- [x] LLM integration via OpenAI-compatible proxy
- [x] Token estimation with Anthropic tokenizer
- [x] agents.md loading and truncation
- [x] Server-side configuration in src/server.js and YAML files
- [x] vitest test setup
- [x] oxlint/oxfmt linting and formatting
- [x] Project documentation (architecture, development guide, configuration, roadmap)

---
