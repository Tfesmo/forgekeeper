---
title: "Qdrant Knowledge Base"
tags: [tooling, knowledge-base, mcp]
topics: [qdrant, rag, mcp-tools]
keywords: [qdrant-find, vector-search, RAG, MCP]
summary: "When and how to use the Qdrant vector search tool for project documentation queries."
llm_hints: "Target audience: AI agents. Covers when to use qdrant-mcp_qdrant-find vs direct file reads, and what topics belong in the knowledge base."
skip_ingest: true
---

# Qdrant Knowledge Base

> **Purpose:** Guidelines for using the Qdrant vector search tool to query ingested project documentation.

Use `qdrant-project_qdrant-find` to search the ingested markdown knowledge base. The docs are chunked by header and embedded with `all-MiniLM-L6-v2`.



## When to Use

This section covers when the Qdrant search tool should be the first choice for retrieving information.

- User asks about game mechanics, AI players, mod system, or any documented topic
- User asks about project conventions, architecture, or how something works
- The topic is covered in the `docs/` directory and has been ingested into Qdrant
- User asks a question that requires searching across multiple documents


## When Not to Use

This section covers cases where direct file reads or other tools are preferred over vector search.

- Editing files, running commands, or writing code
- Simple one-file questions where the file path is obvious (e.g., "read agents.md")
- Topics not yet ingested into the knowledge base
- When the user provides a specific file path to read


## Current Scope

This section lists the documents ingested and searchable in the Qdrant collection.

- `ai-players.md` — AI player behavior, memory logic, discard rules
- `architecture.md` — System architecture and module structure
- `markdown-best-practices.md` — RAG pipeline documentation conventions
- `markdown-syntax.md` — Formatting and syntax rules
- `mod-system.md` — Mod discovery and loading
- `gameplay.md` — Game rules, phases, scoring
- Other `docs/*.md` files


## Troubleshooting

This section covers steps to take when Qdrant search returns no results or errors.

- Fall back to `glob`/`grep` for the topic
- Verify the relevant doc has been ingested (check `data/.ingest_manifest.json`)
- If needed, re-run `scripts/ingest.py` to update the collection
- If Qdrant returns a vector error, the MCP server and ingest script may be using mismatched vector configurations

---

Cross-references: [markdown-best-practices.md](markdown-best-practices.md), [markdown-syntax.md](markdown-syntax.md)
