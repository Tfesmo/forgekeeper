---
title: "MCP Tools Research"
tags: [mcp, tools, research, planning]
topics: [tool-catalog, cost-system, tool-vs-mcp]
keywords: [mcp, cli-tools, tool-cost, tool-delivery]
summary: "Research and planning for MCP tool catalog, cost system, and tool vs MCP comparison."
llm_hints: "Target audience: project maintainer. Covers research tasks for MCP tool integration, categorized by priority."
---

# MCP Tools Research

> **Purpose:** Research and planning artifacts for MCP tool integration. Not yet implemented.

This document tracks research tasks needed before implementing MCP tool support.

---

## Tool Catalog

Research standard CLI tools accessible via MCPs. Categorize each as:

- **Must-have** — Essential for core functionality
- **Want** — Significant value, implement when capacity allows
- **Nice-to-have** — Useful but low priority

Consider tools for:

- File operations (read, write, search, diff)
- Git operations (status, diff, log, commit)
- Web search and browsing
- Process execution
- Environment inspection

---

## System Message Injection

Design how tool information and instructions are injected into the system prompt.

Requirements:

- Prefer cheap tools, escalate to expensive ones
- Support multiple delivery methods for tool information
- Support multiple delivery methods for role instructions

---

## Tool vs MCP Comparison

Research whether there is any benefit to calling some things tools vs MCPs. Consider:

- Latency differences
- Feature availability
- Implementation complexity
- User configuration burden

---

## Cost System

Design a cost model for tool/MCP calls. Consider:

- Context/information cost per tool
- Tool output normalization (pass/fail summaries)
- Git diff summaries
- Prompt caching strategy (static prompt + per-request overlay)

---
