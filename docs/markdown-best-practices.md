---
title: "Markdown Best Practices"
tags: [markdown, best-practices, rag, documentation]
topics: [formatting, content-structure, rag-pipelines]
keywords: [markdown, rag, vector-database, chunking, formatting-rules]
summary: "Rules for writing and structuring Markdown content for RAG pipelines and vector database ingestion."
llm_hints: "Target audience: technical writers and content creators. Covers formatting rules, content structure, and best practices optimized for retrieval-augmented generation pipelines."
---

# Markdown Best Practices

> **Purpose:** Rules for writing and structuring Markdown content for RAG pipelines and vector database ingestion. Syntax rules are covered in [markdown-syntax.md](markdown-syntax.md).

This section covers the document structure and organization rules for all Markdown files.

---


## Table of Contents

- [1. Document Structure](markdown-best-practices.md#1-document-structure)
- [2. Lists and Bullets](markdown-best-practices.md#2-lists-and-bullets)
- [3. Tables](markdown-best-practices.md#3-tables)
- [4. Code Blocks](markdown-best-practices.md#4-code-blocks)
- [5. Links and Images](markdown-best-practices.md#5-links-and-images)
- [6. Text Formatting](markdown-best-practices.md#6-text-formatting)
- [7. Section Summaries](markdown-best-practices.md#7-section-summaries)
- [8. Session Starters](markdown-best-practices.md#8-session-starters)
- [9. Content Guidelines for RAG](markdown-best-practices.md#9-content-guidelines-for-rag)
- [10. Lint Suppression](markdown-best-practices.md#10-lint-suppression)
- [11. Validation Checklist](markdown-best-practices.md#11-validation-checklist)

---


## 1. Document Structure

This section covers top-level document structure including H1 requirements, file naming, and logical ordering.

### 1.1 Top-Level Organization

- Every Markdown file **must** have a single `# H1` heading. The H1 is the document title.
- Place a YAML frontmatter block at the top of the file (see [YAML Frontmatter](markdown-syntax.md)).
- Follow the H1 with a brief introductory paragraph (1-2 sentences summarizing the document).

```markdown
---
title: "Document Title"
tags: [tag1, tag2, tag3]
topics: [topic-a, topic-b]
keywords: [keyword1, keyword2]
summary: "A one-sentence summary of this document."
llm_hints: "Additional context to help LLMs retrieve and reason about this content."
---

# Document Title

Brief introductory paragraph here.
```

### 1.2 File Naming

- Use lowercase with hyphens: `user-authentication.md`, not `User Authentication.md` or `user_authentication.md`.
- Keep filenames descriptive but concise (max 50 characters).

### 1.3 Logical Ordering

- Order sections by logical dependency: prerequisites first, then usage, then advanced topics.
- Related concepts **must** be grouped in the same file, not scattered across multiple files.
- If a document contains multiple unrelated subtopics, split it into smaller, self-contained files with clear titles.

---


## 2. Lists and Bullets

This section covers list formatting, nested list indentation, cross-file deduplication, and inline list usage.

### 2.1 Use Dash Bullets Only

- Use `-` for unordered lists. Never use `*`, `+`, `•`, `–`, or `—`.

```markdown
- First item
- Second item
- Third item
```

### 2.2 Numbered Lists

- Use `1.`, `2.`, `3.` for ordered lists.
- Numbered lists **must** be sequential without gaps.
- Use numbered lists when sequence or priority matters.

### 2.3 Transitions Between Items

- Add connective phrases between list items to guide the LLM through content flow.
- Example: "After completing step 2, do..." or "Once installed, verify..."

```markdown
1. Install the package.
2. Configure your database connection. After that, restart the service.
3. Verify the setup by running the health check endpoint.
```

### 2.4 Nested Lists

- Indent nested items with exactly 2 spaces per level.
- Maximum nesting depth: 3 levels.

```markdown
- Top level
  - Nested level (2 spaces)
    - Deeply nested (4 spaces)
```

### 2.5 Cross-File Deduplication

- If the same list item appears in multiple files, consolidate into a single canonical list.
<!-- lint:next-line -->
- Replace duplicates with cross-references: "See [Section X](file.md#section-x) for details."
- When uncertain about the authoritative version, **must** ask the user or maintainer before choosing.

### 2.6 Inline Lists

- For short, related items inline, use commas: `Use a, b, or c depending on the situation.`

---


## 3. Tables

This section covers table usage guidelines and provides flat-level syntax and nested bulleted list alternatives.

### 3.1 Tables Are Allowed

- Tables are allowed in Markdown files for RAG ingestion.
- Modern embedding models handle markdown tables well.
- Tables **must** be accompanied by a descriptive summary paragraph for better retrieval quality.

### 3.2 Flat-Level Syntax (Preferred Alternative)

- For simple data, flat-level syntax is preferred for consistency.

```markdown
- `host` — type: string, required: yes, default: `localhost` — Database host address.
- `port` — type: integer, required: no, default: `5432` — Database port number.
```

### 3.3 Multi-Level Bulleted Lists (Alternative)

- Use nested bullets for hierarchical data.

```markdown
- Configuration
  - `host`
    - Type: string
    - Required: yes
    - Default: `localhost`
    - Description: Database host address
  - `port`
    - Type: integer
    - Required: no
    - Default: `5432`
    - Description: Database port number
```

---


## 4. Code Blocks

This section covers fenced code blocks, inline code, and code block formatting rules.

### 4.1 Fenced Code Blocks

- Use triple backticks with a language identifier.

````markdown
```python
def example():
    return "hello"
```
````

### 4.2 Inline Code

- Use single backticks for inline code references.

```markdown
Use the `config` module to load settings.
```

### 4.3 Code Block Rules

- Always specify a language identifier.
- Keep code blocks concise (max 50 lines). For longer code, reference external files.
- Include comments only when the code is not self-explanatory.
- See [Trailing Whitespace](markdown-syntax.md) for whitespace rules.

---


## 5. Links and Images

This section covers link formatting, link text guidelines, and image best practices.

### 5.1 Links

- Use reference-style links for URLs that appear multiple times.
- Keep link text descriptive and meaningful (not "click here" or "read more").

```markdown
See the [API reference](api-reference.md) for endpoint details.
```

- Remove navigation links, footer links, and redundant internal links.
- External links: include only if the content adds significant value. Strip tracking parameters from URLs.

### 5.2 Images

- Use descriptive alt text for all images.
- Remove decorative images that add no semantic value.
- Prefer embedded text over images for information (text is searchable and embeddable).
- If an image is critical, describe its content in the surrounding paragraph.

---


## 6. Text Formatting

This section covers bold/italic usage, emoji removal, brevity rules, and section disambiguation.

### 6.1 Bold and Italic

- Use `**bold**` for emphasis of key terms on first use.
- Use `*italic*` for foreign words, technical terms, or file/command names.
- Do not use bold/italic for stylistic emphasis within body text.

### 6.2 Emojis

- **Remove emojis** from all Markdown files. They add no semantic value for vector embeddings and increase token count.
- Replace with text equivalents: `[checkmark]` → `[PASS]`, `[warning_icon]` → `[WARNING]`.

### 6.3 Brevity Rules

- Write in active voice. Replace passive constructions.
- Replace clauses with phrases where possible: "which is used for" → "for".
- Remove filler words: "very", "really", "quite", "in order to" → "to".
- Avoid nominalizations: "make a determination" → "decide".
- Define acronyms on first use only: `Retrieval-Augmented Generation (RAG)`. Thereafter, use the acronym.
- If a concept is explained in Section A, do not re-explain in Section B. Cross-reference instead.

### 6.4 Disambiguation

- Each section **must** be focused on a single topic.
- If a section covers multiple topics, split it using sub-headings.

---


## 7. Section Summaries

Add a 1–2 sentence summary paragraph after every `##` heading to describe the section content.

```markdown
## Authentication

This section covers all authentication methods supported by the system.

### API Keys

...
```

---


## 8. Session Starters

This section covers adding transition phrases before procedural steps to improve semantic matching.

- For procedural content, add a transition phrase before steps to create high semantic matching with common queries.
- Example: "If you are looking to order software, follow the steps below…"

---


## 9. Content Guidelines for RAG

This section covers chunking-friendly structure, deduplication, semantic clarity, metadata enrichment, and noise reduction.

### 9.1 Chunking-Friendly Structure

These rules ensure content is optimal for header-based and hybrid chunking strategies:

- **Self-contained sections:** Each `##` or `###` section should be a coherent, standalone topic.
- **Limit section length:** Each section should stay under ~800 tokens. If a section exceeds this, split it using sub-headings (`###`, `####`) with ~50-token overlap.
- **Group related concepts:** Related topics must appear in the same file, not scattered across multiple files.

### 9.2 Deduplication

- Deduplicate at the document level before chunking, not at the chunk level.
- If two sections share >60% semantic similarity, merge them or add a "See also" link.
- Versioned content: keep the latest version only. Archive older versions externally.
- If uncertain whether content is a duplicate, **must** ask the user or content maintainer before merging.

### 9.3 Semantic Clarity

- Use complete sentences in body text. Avoid fragmented notes.
- Use consistent terminology throughout the document.
- Define acronyms on first use.

### 9.4 Metadata Enrichment

- Fill in all frontmatter fields (see [YAML Frontmatter](markdown-syntax.md)).
- The `llm_hints` field should include:
  - Target audience
  - Related topics
  - Common use cases
  - Known limitations or caveats

### 9.5 Noise Reduction

- Remove: navigation elements, breadcrumbs, "Last updated" timestamps, author names, share buttons, sidebar links.
- Keep: headings, body text, code blocks, flat-level data, essential links, essential image descriptions.

---


## 10. Lint Suppression

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


## 11. Validation Checklist

This section provides a checklist for validating Markdown files before RAG ingestion.

Every Markdown file should pass the following checks before ingestion:

- [ ] Single YAML frontmatter at top
- [ ] `title` field present in frontmatter
- [ ] `tags` array present in frontmatter
- [ ] Exactly one H1 heading
- [ ] No heading level skips (H1→H2→H3)
- [ ] Only `-` bullets (no `*`, `+`, `•`)
- [ ] Tables accompanied by section summaries
- [ ] All code blocks have language tags
- [ ] No trailing whitespace
- [ ] Single blank line between paragraphs
- [ ] Two blank lines before H2+
- [ ] UTF-8 without BOM
- [ ] LF line endings only
- [ ] File ends with exactly one `\n`
- [ ] No emojis
- [ ] No navigation/footer noise
- [ ] Active voice used
- [ ] No redundant explanations
- [ ] Section summaries present after each H2

---
