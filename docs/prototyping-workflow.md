---
title: "Prototyping Workflow"
tags: [prototyping, workflow, autonomous, implementation]
topics: [planning, checklists, reminders, notes, permissions, documentation]
keywords: [prototyping, alpha-quality, checklist, reminder-prompt, handoff, autonomous-execution]
summary: "Reference for the Forgekeeper prototyping workflow: a bounded autonomous implementation mode that produces alpha-quality checkpoints with clear handoff documentation."
llm_hints: "Target audience: LLM agents and users running prototyping sessions. Covers the full prototyping lifecycle including planning sessions, scoped checklists, reminder prompts, notes discipline, permissions, documentation triggers, and commit restrictions."
---

# Prototyping Workflow

> **Purpose:** Defines prototyping as a bounded autonomous implementation mode. Its output is an alpha-quality implementation checkpoint that another engineer (human or AI) can confidently continue from.

This document covers the complete prototyping workflow from planning through handoff. For the broader development workflow, see [development-guide.md](development-guide.md).

---

## Table of Contents

- [1. Prototyping Concept](#1-prototyping-concept)
- [2. Full Workflow](#2-full-workflow)
- [3. Planning Session](#3-planning-session)
- [4. Checklist Design](#4-checklist-design)
- [5. Reminder Prompt](#5-reminder-prompt)
- [6. Notes in Prototyping](#6-notes-in-prototyping)
- [7. Permissions](#7-permissions)
- [8. Documentation in Prototyping](#8-documentation-in-prototyping)
- [9. Completion Criteria](#9-completion-criteria)

---

## 1. Prototyping Concept

Prototyping is a bounded autonomous implementation mode.

Its purpose is to produce an alpha-quality implementation checkpoint that another engineer (human or AI) can confidently continue from.

It is:

- scoped execution
- measurable progress
- documented compromises
- preserved future paths

It is not:

- "write disposable code quickly"
- "make the repo better autonomously"
- "replace architecture decisions"

---

## 2. Full Workflow

```
Planning session (Analyst)
  ↓
Scoped checklist
  ↓
Prototyping mode (Implementer)
  ↓
Task-by-task execution
  ↓
Implementation
  ↓
Documentation when warranted
  ↓
Focused review (Reviewer)
  ↓
Notes + checklist updates
  ↓
Optional integration passes
```

---

## 3. Planning Session

Before autonomous execution, a planning session defines the scope boundaries. The planning session establishes:

- goal
- scope
- constraints
- checklist
- known exclusions

Example:

```markdown
# Implement AI Player

## Goal

Add basic AI opponent behavior.

## Tasks

- [ ] Implement AI Player
  - [ ] Add AI decision loop
  - [ ] Add move selection
  - [ ] Add difficulty settings

## Constraints

- Do not redesign combat.
- Use existing evaluation system.
- Tests and Linter must pass before you mark each complete.

## Future ideas

- Better search algorithm
- Adaptive difficulty

## Decisions for review
```

The planning session prevents autonomous scope expansion.

---

## 4. Checklist Design

The preferred approach is task lifecycle, not global phases.

Each task follows its own cycle:

- Task A:
  - Implement
  - Review
  - Record notes
- Task B:
  - Implement
  - Review
  - Record notes
- Task C:
  - Implement
  - Review
  - Record notes

### Checklist as Documentation

The checklist becomes a durable artifact that serves as:

- progress tracker
- implementation history
- handoff document
- future work queue

Each completed item should include notes:

```markdown
- [x] Add AI turn manager

  Implemented using existing TurnController.

  Known limitation:
  No multiplayer prediction.

  Future:
  Extract AI planning system.
```

This preserves the reasoning behind changes rather than losing it.

---

## 5. Reminder Prompt

### Purpose

The reminder restores the mode contract after context pruning. It should not contain task details, project history, or implementation summaries. Those belong in the checklist, notes, and code. The reminder defines behavior and points the model back at the checklist.

### Injection

Use a generated system message with this ordering:

1. Forgekeeper instructions
2. Available tools
3. Current mode + reminder
4. Relevant notes/context
5. User task

Do not store the reminder as conversation history because pruning may remove it.

### Layered Configuration

The reminder uses layered configuration:

```
Forgekeeper defaults
  ↓
Project defaults (future)
  ↓
User edits for this session
```

The user edits the reminder before starting a prototyping run. The edit applies only to that session.

### Example

```
Mode: Prototyping

Reminder:

You are working toward an alpha-quality implementation.

Prioritize:
- Functional code.
- Completing the checklist.
- Documenting shortcuts and known limitations.
- Preserving future refactoring paths.

Do not expand scope beyond defined tasks.

Checklist: docs/ai-player-prototyping.md
```

---

## 6. Notes in Prototyping

For notes discipline during prototyping — priority order, good/bad examples, temporary decisions, and questions — see [notes-system.md](notes-system.md#8-notes-in-prototyping-mode).

Checklist items carry implementation notes inline. Notes and checklist notes complement each other: checklists capture per-task history, while notes capture cross-task decisions and context that affects future work.

---

## 7. Permissions

### Allowed

- edit files
- create files
- run tests
- update checklist
- create notes
- make temporary implementation choices

### Restricted

- silently remove major systems
- expand scope without approval
- mark temporary decisions as permanent
- delete important knowledge

---

## 8. Documentation in Prototyping

Documentation is driven by **change impact**, not every edit. See [development-guide.md](development-guide.md#9-documentation-behavior) for the full trigger rules.

During prototyping specifically:

1. Finish step
2. Diff analysis
3. Does this create durable knowledge?
4. Documentation update if needed

### Document

- APIs
- user-facing behavior
- configuration
- architecture decisions
- workflows

### Avoid Documenting

- variable changes
- trivial fixes
- temporary experiments

Documentation should be an explicit step, not an afterthought. It should live solo in the checkmark file. Integrate with existing documentation after review.

### Task Completion Criteria

A task is only marked done when tests and linter pass. Skipping tests or adjusting the linter is not allowed.

### Commit Restrictions

Prototyping cannot commit to the `main` branch. This is an MCP restriction. Commit after each task. Create a PR at the end of the prototyping session.

---

## 9. Completion Criteria

A successful Prototyping run produces:

- working code
- a clear checklist state
- useful notes
- known limitations
- a list of choices and alternative options
- future direction

It creates a high-quality intermediate checkpoint rather than pretending the project is finished.

---
