---
title: "Roles and Workflows"
tags: [roles, workflows, sessions, agent-behavior]
topics: [advisor, architect, implementer, reviewer, prototyping, coding]
keywords: [roles, work-flows, session-management, role-switching, agent-routing]
summary: "Reference for Forgekeeper's agent roles, workflows, and session management."
llm_hints: "Target audience: LLM agents and users. Covers core roles (advisor, architect, implementer, reviewer), prototyping and coding workflows, role switching, and session management."
---

# Roles and Workflows

> **Purpose:** Reference for Forgekeeper's agent roles, workflows, and session management.

This document covers the core concepts that define how agents operate within Forgekeeper.

---

## Table of Contents

- [1. Sessions](#1-sessions)
- [2. Core Roles](#2-core-roles)
- [3. Prototyping Workflow](#3-prototyping-workflow)
- [4. Coding Workflow](#4-coding-workflow)
- [5. Role Switching](#5-role-switching)
- [6. Notes](#6-notes)

---

## 1. Sessions

A session is a unit of work that persists across terminal reloads. Sessions maintain conversation context, agent state, and any notes or debug information accumulated during the session.

---

## 2. Core Roles

Forgekeeper uses four core roles. Each role guides model behavior and influences available tools:

- **Advisor** — Investigation, guidance, exploration
- **Architect** — Design, structure, decisions
- **Implementer** — Building, modifying code
- **Reviewer** — Validation, correctness checks

Note: "Analyst" in examples and workflows maps to "advisor".

MCPs are role-aware and prohibit actions outside the defined role's scope.

---

## 3. Prototyping Workflow

The prototyping workflow is a structured sequence, not user-editable. It follows this pattern:

```
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

```
Advisor <-> Implementor
```

Agent and user collaborate iteratively without a fixed sequence.

---

## 5. Role Switching

Role changes use explicit transitions in prompts rather than model inference. Roles are tracked via the `forgekeeper.role` metadata field on user messages (see [configuration.md](configuration.md)).

When a user message has a different `forgekeeper.role` than the previous forgekeeper message, `formatMessagesForLLM` injects a `[Role Transition: analyst → implementer]` label into the message content.

Benefits:

- Easier pruning
- Less ambiguity
- Better state management
- Conversation history preserved across role switches

Stable role signals are likely beneficial for MoE routing. Prefer concise role labels over elaborate personas.

---

## 6. Notes

For details on the notes system, see [notes-system.md](notes-system.md).

Agents can write and search notes to preserve important discoveries, decisions, and unresolved questions.

---
