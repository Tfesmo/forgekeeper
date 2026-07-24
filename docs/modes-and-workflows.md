---
title: "Modes and Workflows"
tags: [modes, workflows, sessions, agent-behavior, mode-tracking]
topics: [advisor, architect, implementer, reviewer, prototyping, coding, mode-tracking]
keywords: [modes, work-flows, session-management, mode-switching, agent-routing, mode-tracking]
summary: "Reference for Forgekeeper's agent modes, workflows, session management, and mode tracking implementation."
llm_hints: "Target audience: LLM agents and users. Covers core modes (advisor, architect, implementer, reviewer), prototyping and coding workflows, mode switching, session management, and mode tracking implementation."
---

# Modes and Workflows

> **Purpose:** Reference for Forgekeeper's agent modes, workflows, and session management.

This document covers the core concepts that define how agents operate within Forgekeeper.

---


## Table of Contents

- [1. Sessions](#1-sessions)
- [2. Core Modes](#2-core-modes)
- [3. Prototyping Workflow](#3-prototyping-workflow)
- [4. Coding Workflow](#4-coding-workflow)
- [5. Mode Switching](#5-mode-switching)
- [6. Mode Tracking Implementation](#6-mode-tracking-implementation)
- [7. Notes](#7-notes)

---


## 1. Sessions

A session is a unit of work that persists across terminal reloads. Sessions maintain conversation context, agent state, and any notes or debug information accumulated during the session.

---


## 2. Core Modes

Forgekeeper uses four core modes. Each mode guides model behavior and influences available tools:

- **Advisor** — Investigation, guidance, exploration
- **Architect** — Design, structure, decisions
- **Implementer** — Building, modifying code
- **Reviewer** — Validation, correctness checks

Note: "Analyst" in examples and workflows maps to "advisor".

MCPs are role-aware and prohibit actions outside the defined role's scope.

---


## 3. Prototyping Workflow

The prototyping workflow is a structured sequence, not user-editable. It follows this pattern:

``` text
Advisor → Implementor → Reviewer
```

Goal: Produce a working draft that preserves future engineering decisions, not final production-ready code.

Expected output:

- Working implementation
- Tests where practical
- Clear TODOs
- Comments explaining compromises
- Notes about refactoring opportunities

Handoff documentation should include:

- Incomplete areas
- Known shortcuts
- Future refactors
- Design questions

The next engineer (human or AI) should understand what works, what is temporary, and what needs attention.

For the full prototyping lifecycle, see [prototyping-workflow.md](prototyping-workflow.md).

---


## 4. Coding Workflow

The coding workflow is free-form and bidirectional:

``` text
Advisor <-> Implementor
```

Agent and user collaborate iteratively without a fixed sequence.

---


## 5. Mode Switching

Mode changes use explicit transitions in prompts rather than model inference. Modes are tracked via the `forgekeeper.mode` metadata field on user messages (see [configuration.md](configuration.md)).

Benefits:

- Easier pruning
- Less ambiguity
- Better state management
- Conversation history preserved across mode switches

Stable mode signals are likely beneficial for MoE routing. Prefer concise mode labels over elaborate personas.

---


## 6. Mode Tracking Implementation

Mode labels are injected into message content at insert time (not reformatted on every LLM call). This approach is safe for the messages contract and keeps pruning straightforward.

### How It Works

When a new user message is inserted via `resolveSessionForStream`, the server checks the mode context and injects labels:

- **Initial mode**: If the previous message is a system message (new session or session reset), prepend `"Your current mode is: [Analyst]\n"` (or whichever mode is set).
- **Mode transition**: If the mode differs from the most recent forgekeeper message, prepend `"Previous mode: [Analyst], your new mode is: [Implementor]\n"`.

Mode labels are injected into the `content` field at message creation time. The `forgekeeper.mode` metadata is also stored on the message but is stripped before sending to the LLM API (see `prepareMessagesForAPI` in `llmService.js`).

### Prune Behavior

Pruning only removes messages from the front of the array (oldest messages). Mode labels travel with their messages, so no strip-and-rewalk is needed. The initial mode label stays on the first user message; mode transition labels stay on the messages where they were injected.

### Label Format

Mode labels use a concise prefix format:

``` text
Your current mode is: [Analyst]
Previous mode: [Analyst], your new mode is: [Implementor]
```

The labels are designed to be:

- **Short** — minimal token cost per message.
- **Explicit** — unambiguous mode signal for the LLM.
- **Non-confusing** — the format is a simple informational prefix, not a directive. The system prompt already defines available modes, so this is consistent with existing behavior.

---


## 7. Notes

For details on the notes system, see [notes-system.md](notes-system.md).

Agents can write and search notes to preserve important discoveries, decisions, and unresolved questions.

---
