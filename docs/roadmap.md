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
  - [Context Management](#context-management)
  - [Long-Term Memory](#long-term-memory)
  - [Agent Enhancements](#agent-enhancements)
  - [UI Enhancements](#ui-enhancements)
  - [CLI Improvements](#cli-improvements)
  - [Testing](#testing)
  - [Documentation](#documentation)
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

- [x] Aggressive context pruning with concrete rules (preserve system messages, current role, decisions; summarize older conversations)
- [ ] Tool cost system (context/information cost per tool)
- [ ] Tool output normalizer (pass/fail summaries, git diff summaries)
- [ ] Prompt caching strategy (static prompt + per-request overlay)
- [ ] Context window usage visualization in the UI
- [ ] Configurable context limits per session
- [ ] Inject git status after pruning if working directory has uncommitted changes
- [ ] Inject reminder of user's original request after all pruning events to preserve context

### Long-Term Memory

- [ ] Vector database integration (Chroma, Qdrant) for session memory
- [ ] Automatic note-taking by the agent after each session
- [ ] Semantic search over historical notes

### Agent Enhancements

- [x] Prototyping workflow (structured: Advisor → Implementor → Reviewer)
- [x] Coding workflow (free-form: Advisor <-> Implementor)
- [x] Notes system (write, search, archive)
- [x] Role switching with explicit transitions
- [ ] Multi-agent support (different agents for different tasks)
- [ ] Agent profiles with custom prompts and file references
- [ ] Dynamic agents.md loading based on active agent

### UI Enhancements

- [ ] Panel system for session notes and debug information
- [ ] Pause/start button to halt agent tool requests and resume with last message

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
