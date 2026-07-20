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
- [2. Planned Additions](#2-planned-additions)
- [3. Completed](#3-completed)

---

## 1. Current Status

Forgekeeper is in very early development. The core chat interface is functional with:

- Terminal UI via Ink/React
- LLM integration via OpenAI-compatible proxy
- Token estimation and display
- agents.md system prompt loading
- Basic command system (help, settings, echoi, passthrough)
- Settings management (~/.forgekeeper/settings.json)
- Test suite skeleton with vitest

---

## 2. Planned Additions

### Context Management

- [ ] Aggressive context pruning when conversation exceeds `CONTEXT_LIMIT`
- [ ] Context window usage visualization in the UI
- [ ] Configurable context limits per session

### Long-Term Memory

- [ ] Vector database integration (Chroma, Qdrant) for session memory
- [ ] Automatic note-taking by the agent after each session
- [ ] Semantic search over historical notes

### Agent Enhancements

- [ ] Multi-agent support (different agents for different tasks)
- [ ] Agent profiles with custom prompts and file references
- [ ] Dynamic agents.md loading based on active agent

### CLI Improvements

- [ ] Interactive settings editor (currently a placeholder)
- [ ] Session management (list, resume, delete sessions)
- [ ] Configurable LLM proxy URL and model
- [ ] Command history with up/down navigation

### Testing

- [ ] Full test coverage for all modules
- [ ] Integration tests for LLM proxy communication
- [ ] Snapshot tests for UI components

### Documentation

- [ ] API reference for exported functions
- [ ] Contributing guide
- [ ] Architecture diagrams

---

## 3. Completed

- [x] Basic Ink/React terminal UI
- [x] LLM integration via OpenAI-compatible proxy
- [x] Token estimation with Anthropic tokenizer
- [x] agents.md loading and truncation
- [x] Settings management in ~/.forgekeeper/settings.json
- [x] Command system with help, echoi, passthrough
- [x] vitest test setup
- [x] oxlint/oxfmt linting and formatting
- [x] Project documentation (architecture, development guide, configuration, roadmap)

---
