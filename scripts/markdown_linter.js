#!/usr/bin/env node
/**
 * markdown_linter.js — Standalone markdown linter for RAG embedding pipeline readiness.
 *
 * Usage:
 *     node markdown_linter.js docs/
 *     node markdown_linter.js docs/architecture.md
 *     node markdown_linter.js --json docs/
 *
 * Exit codes:
 *     0 — All clean
 *     1 — Errors found
 */

import { readFileSync, statSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stripLintDirectives(text) {
  const lines = text.split("\n");
  const resultLines = [];
  let blockSuppressed = false;
  let blockRule = null;
  let nextLineSuppressed = false;

  for (const line of lines) {
    const stripped = line.trim();

    const offMatch = stripped.match(/^<!--\s*lint:off(\s*:.*?)?\s*-->/);
    if (offMatch) {
      blockSuppressed = true;
      blockRule = offMatch[1] ? offMatch[1].slice(1) : null;
      continue;
    }

    const onMatch = stripped.match(/^<!--\s*lint:on\s*-->/);
    if (onMatch && blockSuppressed) {
      blockSuppressed = false;
      blockRule = null;
      continue;
    }

    const nextMatch = stripped.match(/^<!--\s*lint:next-line(:.*?)?\s*-->/);
    if (nextMatch) {
      nextLineSuppressed = true;
      continue;
    }

    if (blockSuppressed) {
      continue;
    }
    if (nextLineSuppressed) {
      nextLineSuppressed = false;
      continue;
    }

    resultLines.push(line);
  }

  return resultLines.join("\n");
}


function readFileSyncSafe(path) {
  try {
    const raw = readFileSync(path);
    const text = raw.toString("utf-8");
    return { raw, text, error: null };
  } catch (e) {
    return { raw: null, text: null, error: `Could not read file: ${e.message}` };
  }
}


function collectMdFiles(paths) {
  const files = [];

  function walkDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isFile() && entry.endsWith(".md")) {
        files.push(fullPath);
      } else if (stat.isDirectory()) {
        walkDir(fullPath);
      }
    }
  }

  for (const p of paths) {
    const resolved = resolve(p);
    try {
      const stat = statSync(resolved);
      if (stat.isFile() && resolved.endsWith(".md")) {
        files.push(resolved);
      } else if (stat.isDirectory()) {
        walkDir(resolved);
      }
    } catch {
      // skip unreadable paths
    }
  }
  return [...new Set(files)].sort();
}


function findCodeRanges(lines) {
  const ranges = [];
  let inBlock = false;
  let blockStart = -1;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!inBlock && /^(`{3,}|~{3,})/.test(stripped)) {
      inBlock = true;
      blockStart = i;
    } else if (inBlock && /^(`{3,}|~{3,})\s*$/.test(stripped)) {
      ranges.push([blockStart, i]);
      inBlock = false;
    }
  }

  return ranges;
}

function insideCodeBlock(lineIdx, codeRanges) {
  for (const [start, end] of codeRanges) {
    if (start <= lineIdx && lineIdx <= end) {
      return true;
    }
  }
  return false;
}


// ---------------------------------------------------------------------------
// Checks — Encoding & Frontmatter & Headings
// ---------------------------------------------------------------------------

function checkBom(raw) {
  if (raw && raw.length >= 3 && raw[0] === 0xef && raw[1] === 0xbb && raw[2] === 0xbf) {
    return "UTF-8 BOM detected (must be stripped)";
  }
  return null;
}

function checkLineEndings(text) {
  if (text.includes("\r\n")) {
    return "CRLF line endings found (must be LF only)";
  }
  return null;
}

function checkFileEnding(text) {
  if (text.length === 0) {
    return "Empty file";
  }
  if (text[text.length - 1] !== "\n") {
    return "File does not end with newline";
  }
  if (text.length >= 2 && text[text.length - 2] === "\n" && text[text.length - 1] === "\n") {
    return "File ends with multiple newlines";
  }
  return null;
}


function checkFrontmatter(text) {
  const stripped = text.replace(/^\n+/, "");
  if (!stripped.startsWith("---\n") && !stripped.startsWith("---\r")) {
    return "Missing YAML frontmatter (must be first content)";
  }
  const lines = text.split("\n");
  let secondDash = null;
  for (let i = 1; i < Math.min(lines.length, 10); i++) {
    if (lines[i].trim() === "---") {
      secondDash = i;
      break;
    }
  }
  if (secondDash === null) {
    return "YAML frontmatter not closed (missing closing ---)";
  }
  return null;
}


function checkHeadings(lines, codeRanges) {
  const errors = [];
  let lastLevel = 0;
  let h1Count = 0;
  let h1Lines = [];

  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) {
      continue;
    }
    const stripped = lines[i].trim();
    if (!stripped) {
      continue;
    }

    const m = stripped.match(/^(#{1,6})\s+(.+)$/);
    if (!m) {
      continue;
    }

    const level = m[1].length;
    const headingText = m[2].trim();

    if (level === 1) {
      h1Count++;
      h1Lines.push(i + 1);
    }

    if (level > 4) {
      errors.push(`H${level} exceeds maximum depth (H4). Line ${i + 1}: '${headingText}'`);
    }

    if (lastLevel > 0 && level > lastLevel + 1) {
      errors.push(
        `Heading level skip: H${lastLevel} -> H${level}. Line ${i + 1}: '${headingText}'`
      );
    }

    lastLevel = level;
  }

  if (h1Count === 0) {
    errors.push("Missing H1 heading (exactly one required)");
  } else if (h1Count > 1) {
    errors.push(`Multiple H1 headings found (${h1Count}). Expected exactly one.`);
  }

  return errors;
}


// ---------------------------------------------------------------------------
// Checks — Spacing & Whitespace
// ---------------------------------------------------------------------------

function checkTrailingWhitespace(lines, codeRanges) {
  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) {
      continue;
    }
    if (i === 0 && lines[i].trim() === "---") {
      continue;
    }
    const trimmed = lines[i].replace(/\r$/, "").replace(/[ \t]+$/, "");
    const original = lines[i].replace(/\r$/, "");
    if (trimmed !== original) {
      errors.push(`Trailing whitespace on line ${i + 1}`);
    }
  }
  return errors;
}

function checkTabs(lines, codeRanges) {
  const errors = [];
  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) {
      continue;
    }
    if (lines[i].includes("\t")) {
      errors.push(`Tab character found on line ${i + 1}`);
    }
  }
  return errors;
}


function checkSpacing(lines, codeRanges) {
  const errors = [];
  let consecutiveBlank = 0;
  let prevContentEnd = -1;

  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) {
      continue;
    }

    if (i > 0 && insideCodeBlock(i - 1, codeRanges)) {
      for (const [, fenceEnd] of codeRanges) {
        if (fenceEnd === i - 1) {
          prevContentEnd = fenceEnd;
          break;
        }
      }
      if (prevContentEnd === -1) {
        prevContentEnd = i - 1;
      }
      continue;
    }

    const stripped = lines[i].trim();

    if (i === 0 && stripped === "---") {
      continue;
    }

    const isBlank = stripped === "";
    const isH2 = /^##\s/.test(stripped);
    const isH3Plus = /^###/.test(stripped);
    const isCodeFence = /^(`{3,}|~{3,})\s*$/.test(stripped);
    const isBlockquote = /^>\s/.test(stripped);

    if (isBlank) {
      consecutiveBlank++;
      continue;
    }

    if (prevContentEnd >= 0) {
      const blanksSincePrev = i - prevContentEnd - 1;

      if (isH2 && blanksSincePrev < 2) {
        errors.push(
          `Expected 2 blank lines before H2 heading (found ${blanksSincePrev}). Line ${i + 1}: '${stripped}'`
        );
      } else if (isH3Plus && blanksSincePrev < 1) {
        const hMatch = stripped.match(/^(#+)/);
        const hLevel = hMatch ? hMatch[1].length : 3;
        errors.push(
          `Expected 1 blank line before H${hLevel} heading (found ${blanksSincePrev}). Line ${i + 1}: '${stripped}'`
        );
      } else if (isCodeFence && blanksSincePrev < 1) {
        errors.push(`Expected 1 blank line before code block. Line ${i + 1}: '${stripped}'`);
      } else if (isBlockquote && blanksSincePrev < 1) {
        errors.push(`Expected 1 blank line before blockquote. Line ${i + 1}: '${stripped}'`);
      } else if (!isH2 && !isH3Plus && !isCodeFence && !isBlockquote) {
        if (blanksSincePrev > 1) {
          errors.push(
            `Expected 1 blank line between paragraphs (found ${blanksSincePrev}). Line ${i + 1}: '${stripped}'`
          );
        }
      }
    }

    prevContentEnd = i;
  }

  return errors;
}


// ---------------------------------------------------------------------------
// Checks — Code Blocks & Bullets
// ---------------------------------------------------------------------------

function checkCodeBlocksNoLang(lines, codeRanges) {
  const errors = [];
  let inBlock = false;

  for (let i = 0; i < lines.length; i++) {
    const stripped = lines[i].trim();
    if (!inBlock && /^(`{3,}|~{3,})/.test(stripped)) {
      inBlock = true;
      if (!/^(`{3,}|~{3,})\s*\S/.test(stripped)) {
        errors.push(`Code block without language tag at line ${i + 1}`);
      }
    } else if (inBlock && /^(`{3,}|~{3,})\s*$/.test(stripped)) {
      inBlock = false;
    }
  }

  return errors;
}

function checkNonDashBullets(lines, codeRanges) {
  const errors = [];
  const bulletChars = ["\u2022"];

  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) {
      continue;
    }
    const stripped = lines[i].trim();
    const strippedNoInline = stripped.replace(/`[^`]+`/g, "");

    for (const char of bulletChars) {
      if (strippedNoInline.includes(char)) {
        errors.push(`Non-dash bullet character on line ${i + 1}`);
        break;
      }
    }

    if (
      /^[+\*]\s/.test(stripped) &&
      !stripped.startsWith("**") &&
      !stripped.startsWith("* ") &&
      !stripped.startsWith("*:") &&
      !stripped.startsWith("*#")
    ) {
      errors.push(`Non-dash bullet on line ${i + 1}: '${stripped}'`);
      break;
    }
  }

  return errors;
}


function checkMissingSectionSummary(lines, codeRanges) {
  const errors = [];
  let i = 0;

  while (i < lines.length) {
    if (insideCodeBlock(i, codeRanges)) {
      i++;
      continue;
    }
    const stripped = lines[i].trim();

    const m = stripped.match(/^##\s+(.+)$/);
    if (m) {
      const headingText = m[1].trim();
      if (headingText.toLowerCase().replace(/\s/g, "") === "tableofcontents") {
        i++;
        continue;
      }

      let foundSummary = false;
      let j = i + 1;
      while (j < lines.length) {
        const innerStripped = lines[j].trim();
        if (innerStripped === "") {
          j++;
          continue;
        }
        if (/^#{1,6}\s/.test(innerStripped)) {
          break;
        }
        if (/^(`{3,}|~{3,})\s*$/.test(innerStripped)) {
          break;
        }
        if (/^>\s/.test(innerStripped)) {
          j++;
          continue;
        }
        if (innerStripped.length > 5 && !innerStripped.startsWith("-") && !innerStripped.startsWith("1.")) {
          foundSummary = true;
        }
        break;
      }
      if (!foundSummary) {
        errors.push(`Missing section summary after H2 heading. Line ${i + 1}: '${headingText}'`);
      }
    }

    i++;
  }
  return errors;
}


// ---------------------------------------------------------------------------
// Main lint function
// ---------------------------------------------------------------------------

function lintMarkdown(path) {
  const results = [];
  const { raw, text, error: err } = readFileSyncSafe(path);

  if (err) {
    results.push({ severity: "error", message: `Could not read file: ${err}`, line: 0, file: path });
    return results;
  }

  // Encoding checks (errors)
  const bomErr = checkBom(raw);
  if (bomErr) {
    results.push({ severity: "error", message: bomErr, line: 0, file: path });
  }

  const leErr = checkLineEndings(text);
  if (leErr) {
    results.push({ severity: "error", message: leErr, line: 0, file: path });
  }

  const feErr = checkFileEnding(text);
  if (feErr) {
    results.push({ severity: "error", message: feErr, line: 0, file: path });
  }

  // Strip lint suppression directives before content checks
  const textStripped = stripLintDirectives(text);

  const lines = textStripped.split("\n");
  const codeRanges = findCodeRanges(lines);

  // Frontmatter check
  const fmErr = checkFrontmatter(textStripped);
  if (fmErr) {
    results.push({ severity: "error", message: fmErr, line: 0, file: path });
  }

  // Heading checks
  for (const hErr of checkHeadings(lines, codeRanges)) {
    results.push({ severity: "error", message: hErr, line: 0, file: path });
  }

  // Whitespace checks
  for (const twErr of checkTrailingWhitespace(lines, codeRanges)) {
    results.push({ severity: "error", message: twErr, line: 0, file: path });
  }

  for (const tabErr of checkTabs(lines, codeRanges)) {
    results.push({ severity: "error", message: tabErr, line: 0, file: path });
  }

  for (const spErr of checkSpacing(lines, codeRanges)) {
    results.push({ severity: "error", message: spErr, line: 0, file: path });
  }

  // Code block checks
  for (const w of checkCodeBlocksNoLang(lines, codeRanges)) {
    results.push({ severity: "error", message: w, line: 0, file: path });
  }

  for (const w of checkNonDashBullets(lines, codeRanges)) {
    results.push({ severity: "error", message: w, line: 0, file: path });
  }

  for (const w of checkMissingSectionSummary(lines, codeRanges)) {
    results.push({ severity: "error", message: w, line: 0, file: path });
  }

  return results;
}


function lintAll(paths, jsonOutput = false) {
  const files = collectMdFiles(paths);

  if (files.length === 0) {
    console.error("No .md files found.");
    return 0;
  }

  const allResults = [];
  for (const f of files) {
    allResults.push(...lintMarkdown(f));
  }

  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2));
    const errors = allResults.filter((r) => r.severity === "error");
    return errors.length > 0 ? 1 : 0;
  }

  // Text output
  let errorCount = 0;

  for (const r of allResults) {
    const msg = r.message;
    const f = r.file;
    console.log(`  ERROR: ${f} - ${msg}`);
    errorCount++;
  }

  if (allResults.length > 0) {
    console.log();
    console.log(`Results: ${errorCount} error(s)`);
  }

  return errorCount > 0 ? 1 : 0;
}


// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const paths = args.filter((a) => !a.startsWith("--"));

  const exitCode = lintAll(paths, jsonOutput);
  process.exit(exitCode);
}

main();
