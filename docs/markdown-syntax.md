---
title: "Markdown Syntax Rules"
tags: [markdown, syntax, formatting]
topics: [yaml-frontmatter, heading-hierarchy, spacing, encoding, blockquotes]
keywords: [markdown-syntax, yaml, headings, whitespace, encoding, line-endings]
summary: "Minimal structural rules for formatting Markdown files properly. Not a content guide."
llm_hints: "Target audience: all contributors writing Markdown. Covers YAML frontmatter, heading hierarchy, spacing, encoding, and blockquote formatting."
---

# Markdown Syntax Rules

> **Purpose:** Minimal structural rules for formatting Markdown files properly. Not a content guide.

These rules are enforced by `lint.py`. Documents that fail lint will prevent commits.


## Table of Contents

- [1. YAML Frontmatter](markdown-syntax.md#1-yaml-frontmatter)
- [2. Heading Hierarchy](markdown-syntax.md#2-heading-hierarchy)
- [3. Spacing and Whitespace](markdown-syntax.md#3-spacing-and-whitespace)
- [4. Encoding and Line Endings](markdown-syntax.md#4-encoding-and-line-endings)
- [5. Blockquotes](markdown-syntax.md#5-blockquotes)
- [Validation Examples](markdown-syntax.md#validation-examples)

---


## 1. YAML Frontmatter

This section defines the format and ordering rules for YAML frontmatter. All frontmatter rules are enforced by `lint.py`. Missing or malformed frontmatter causes a lint error.

### 1.1 Format Rules

- Delimited by `---` at the top and bottom of the block.
- The frontmatter block **must** be the very first content in the file.
- Use double quotes for string values containing special characters.
- Arrays use inline bracket notation: `[tag1, tag2, tag3]`.
- Preserve the order: `title`, `tags`, `topics`, `keywords`, `summary`, `llm_hints`.


## 2. Heading Hierarchy

This section defines heading level sequencing, maximum depth, and ATX-style heading formatting. All heading rules are enforced by `lint.py`. Heading hierarchy errors cause lint errors.

### 2.1 No Level Skips

Heading levels **must** be sequential. Skipping levels is invalid.

### 2.2 Maximum Depth

Use up to H4 (`####`) for content.

### 2.3 Heading Style

- Use ATX-style headings (`# Heading`), not Setext-style (`Heading\n---`).
- Always include a space between the `#` characters and the heading text.


## 3. Spacing and Whitespace

This section defines paragraph spacing, trailing whitespace rules, and indentation standards. All spacing and whitespace rules are enforced by `lint.py`. Incorrect spacing is the most common lint error — documents **must** pass spacing checks before RAG ingestion.

### 3.1 Paragraph Spacing

- Exactly one blank line between paragraphs.
- Exactly two blank lines before H2 headings.
- One blank line before H3+ headings and before/after code blocks and blockquotes.

### 3.2 Trailing Whitespace

- **No trailing whitespace** in content lines. (Code block examples demonstrating invalid formatting are exempt.)
- **No form feeds** (`\f`), **no carriage returns** (`\r`), **no non-breaking spaces**.

### 3.3 Indentation

- Use spaces only (no tabs).
- 2 spaces per indentation level (markdown lists, code blocks).


## 4. Encoding and Line Endings

This section defines UTF-8 encoding without BOM, LF line endings, and file termination requirements. All encoding rules are enforced by `lint.py`. Encoding errors cause lint errors.

- **Encoding:** UTF-8 without BOM.
- **Line endings:** LF (`\n`) only. No CRLF.
- **File ending:** The file must end with exactly one newline character (`\n`).


## 5. Blockquotes

This section defines the proper use of blockquotes for cited text and important notes.

- Use sparingly. Only for cited text or important notes.
- Prefix with `> ` and include the source.

> **Note:** This is a style guideline rather than a lint error. Fix if possible.


## Validation Examples

This section provides examples of valid and invalid frontmatter formatting.

### Valid YAML Frontmatter

```yaml
---
title: "Example Document"
tags: [markdown, syntax, formatting]
topics: [yaml-frontmatter]
keywords: [markdown-syntax, yaml]
summary: "A brief summary of the document."
llm_hints: "Instructions for LLM consumers."
---
```

### Valid Heading Hierarchy

```markdown
# H1        OK
## H2       OK
### H3      OK
#### H4     OK
```

### Invalid Heading Hierarchy

```markdown
# H1        OK
### H3      INVALID -- skipped from H1 to H3
```

### Valid Paragraph Spacing

```markdown
First paragraph text.

Second paragraph text.


## Section Heading
```

### Valid Blockquote

```markdown
> "Always chunk by semantic boundaries, not arbitrary token counts."
> -- RAG Best Practices
```

### Valid Indentation

```markdown
- List item one
  - Nested item (2 spaces)
    - Deeply nested item (4 spaces)
```

### Invalid Trailing Whitespace

```markdown
This line has trailing spaces   
This line is clean
```

### Invalid Encoding

```text
CRLF line endings: Windows-style \r\n
BOM marker: EF BB BF at start of file
```
