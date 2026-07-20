---
title: "Notes System"
tags: [notes, memory, knowledge-management, context]
topics: [note-writing, note-search, note-archiving, temporary-vs-durable]
keywords: [notes, engineering-notebook, knowledge-preservation, context-management]
summary: "Reference for the Forgekeeper notes system: writing, searching, and archiving notes as a curated engineering notebook."
llm_hints: "Target audience: users and LLM agents. Covers the notes tools, what belongs in notes, temporary vs durable notes, permissions, and design principles."
---

# Notes System

> **Purpose:** Reference for the Forgekeeper notes system, which treats notes as a curated engineering notebook rather than an AI memory dump. The goal is to reduce future context requirements by preserving only information that will improve future decisions.

---

## Table of Contents

- [1. Design Principle](#1-design-principle)
- [2. Notes Tools](#2-notes-tools)
- [3. What Belongs in Notes](#3-what-belongs-in-notes)
- [4. Temporary vs Durable Notes](#4-temporary-vs-durable-notes)
- [5. Note Permissions](#5-note-permissions)
- [6. No Automatic Summarization](#6-no-automatic-summarization)
- [7. Future: Note Metadata (Deferred)](#7-future-note-metadata-deferred)
- [8. Notes in Prototyping Mode](#8-notes-in-prototyping-mode)

---

## 1. Design Principle

Notes are a curated engineering notebook, not an AI memory dump.

The purpose is to reduce future context requirements by preserving only information that will improve future decisions.

---

## 2. Notes Tools

### Available Tools

- `write_note` — Create a new note
- `search_notes` — Search existing notes
- `archive_note` — Mark a note as obsolete (do not permanently delete)

### Instruction for the Agent

> Keep notes about important discoveries, decisions, and unresolved questions. Do not record routine actions.

### Design Choice: Archive Over Delete

Storage is cheap; lost knowledge is expensive. Prefer `archive_note` over permanent deletion.

---

## 3. What Belongs in Notes

### Good Candidates

- **Architecture decisions**: "GridMap stores terrain IDs, not terrain objects."
- **Project constraints**: "User maps must remain JSON-compatible."
- **Important discoveries**: "Terrain colors come from TerrainDefinition."
- **Unresolved questions**: "How should user overrides interact with static data?"

### Poor Candidates

- Opened file X
- Ran tests
- Changed line 42
- Temporary debugging output

---

## 4. Temporary vs Durable Notes

Not all notes have equal importance. The system distinguishes between:

### Temporary Notes

- Hypotheses
- Investigations
- Experiments
- Failed approaches

Temporary notes are created during active work and may be archived once they are no longer useful.

### Durable Project Notes

- Architecture decisions
- Conventions
- Constraints
- Stable facts

Durable notes represent persistent knowledge about the project. Promotion from temporary to durable should be selective.

---

## 5. Note Permissions

### Normal Agents

Normal agents can:

- Write notes
- Search notes

### Special Maintenance Role

A special maintenance or prototyper role can:

- Review notes
- Archive obsolete notes

This ensures that only a dedicated role can modify or archive durable project notes.

---

## 6. No Automatic Summarization

Do not append a summary after every response by default.

Reasons:

- Encourages noise
- Fills retrieval with low-value information
- Conflicts with Forgekeeper's goal of smart context management

Better approach:

- Let the model write notes when it identifies something durable
- Let pruning trigger a review: "Are there any important discoveries worth preserving?"

---

## 7. Future: Note Metadata (Deferred)

Notes may eventually need classification and authority levels.

Planned metadata fields:

```json
{
  "content": "GridMap stores terrain IDs.",
  "type": "architecture",
  "authority": "high"
}
```

Possible categories:

- decision
- constraint
- discovery
- observation
- experiment
- TODO

Higher-authority notes should be harder for autonomous roles to modify. This feature is deferred until the core notes system is in place.

---

## 8. Notes in Prototyping Mode

Prototyping has specific notes discipline that differs from normal agent operation.

### Priority Order

Notes are not a substitute for active context. The priority during prototyping is:

1. Current context
2. Current checklist item
3. Code/diff
4. Notes

### Notes Preserve Why, Not Actions

Prototyping notes should capture decisions and reasoning, not routine actions.

Good:

```markdown
Decision:
AI evaluation uses existing CardScore system.

Reason:
Avoid duplicated game rules.
```

Bad:

- Opened AIPlayer.lua
- Changed line 83
- Renamed variable

### Temporary Decisions

Temporary decisions during prototyping must be explicitly marked to prevent shortcuts from becoming accidental architecture.

```markdown
Temporary:
Target selection remains in EnemyController.

Reason:
Fast iteration during prototype.

Future:
Extract TargetingSystem after behavior is validated.
```

### Questions and Recommendations

If the agent has a question during prototyping, Forgekeeper should instruct it to implement its recommendation and document the options and choice.

### Relationship to Checklist

Checklist items carry implementation notes inline (see [prototyping-workflow.md](prototyping-workflow.md#3-checklist-design)). Notes and checklist notes complement each other: checklists capture per-task history, while notes capture cross-task decisions and context that affects future work.

---
