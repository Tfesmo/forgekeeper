---
title: "RAG Guidelines"
tags: [rag, documentation, pipelines, vector-database, embeddings]
topics: [rag-pipelines, chunking, metadata-enrichment, noise-reduction]
keywords: [rag, retrieval-augmented-generation, vector-database, chunking, embeddings, metadata, semantic-matching]
summary: "Guidelines for writing RAG-optimized Markdown content: chunking strategy, deduplication, semantic clarity, metadata enrichment, and noise reduction."
llm_hints: "Target audience: technical writers and content creators. Covers formatting rules, content structure, and best practices optimized for retrieval-augmented generation pipelines."
---

# RAG Guidelines

> **Purpose:** Content guidelines for writing Markdown optimized for RAG pipelines and vector database ingestion. Document structure and formatting rules are covered in [markdown-best-practices.md](markdown-best-practices.md).

This document covers chunking strategy, deduplication, semantic clarity, metadata enrichment, and noise reduction for RAG pipelines.

---

## Table of Contents

- [1. Chunking-Friendly Structure](#1-chunking-friendly-structure)
- [2. Deduplication](#2-deduplication)
- [3. Semantic Clarity](#3-semantic-clarity)
- [4. Metadata Enrichment](#4-metadata-enrichment)
- [5. Noise Reduction](#5-noise-reduction)
- [6. Lint Suppression](#6-lint-suppression)

---

## 1. Chunking-Friendly Structure

These rules ensure content is optimal for header-based and hybrid chunking strategies:

- **Self-contained sections:** Each `##` or `###` section should be a coherent, standalone topic.
- **Limit section length:** Each section should stay under ~800 tokens. If a section exceeds this, split it using sub-headings (`###`, `####`) with ~50-token overlap.
- **Group related concepts:** Related topics must appear in the same file, not scattered across multiple files.

---

## 2. Deduplication

- Deduplicate at the document level before chunking, not at the chunk level.
- If two sections share >60% semantic similarity, merge them or add a "See also" link.
- Versioned content: keep the latest version only. Archive older versions externally.
- If uncertain whether content is a duplicate, **must** ask the user or content maintainer before merging.

---

## 3. Semantic Clarity

- Use complete sentences in body text. Avoid fragmented notes.
- Use consistent terminology throughout the document.
- Define acronyms on first use.

---

## 4. Metadata Enrichment

- Fill in all frontmatter fields (see [YAML Frontmatter](markdown-syntax.md)).
- The `llm_hints` field should include:
  - Target audience
  - Related topics
  - Common use cases
  - Known limitations or caveats

---

## 5. Noise Reduction

- Remove: navigation elements, breadcrumbs, "Last updated" timestamps, author names, share buttons, sidebar links.
- Keep: headings, body text, code blocks, flat-level data, essential links, essential image descriptions.

---

## 6. Lint Suppression

When a lint rule cannot be satisfied, you can suppress it using directive comments. These comments are stripped by the linter and must also be stripped by the RAG ingestion pipeline before chunking to prevent lint metadata from bloating vector chunks.

### Supported Directives

**Block suppression** (skip an entire region):
```markdown
<!-- lint:off -->
content here will not be checked by lint
<!-- lint:on -->
```

**Block suppression with rule name** (skip only specific rules):
```markdown
<!-- lint:off:MissingSectionSummary -->
content here will not be checked for missing summaries
<!-- lint:on -->
```

**Next-line suppression** (skip the immediately following line):
```markdown
<!-- lint:next-line -->
this line will not be checked
```

### RAG Preprocessing

The RAG ingestion pipeline **must** strip lint directives before chunking. Add a preprocessing step that removes lines matching:

```python
import re

def strip_lint_directives(text):
    lines = text.split('\n')
    result = []
    suppressed = False
    for line in lines:
        stripped = line.strip()
        if re.match(r'^<!--\s*lint:off(\s*:.*?)?\s*-->$', stripped):
            suppressed = True
            continue
        if re.match(r'^<!--\s*lint:on\s*-->$', stripped):
            suppressed = False
            continue
        if re.match(r'^<!--\s*lint:next-line(:.*?)?\s*-->$', stripped):
            continue
        if not suppressed:
            result.append(line)
    return '\n'.join(result)
```

---
