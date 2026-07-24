#!/usr/bin/env node
/**
 * markdown_linter.js — Standalone markdown linter for RAG embedding pipeline readiness.
 *
 * Usage:
 *     node markdown_linter.js docs/
 *     node markdown_linter.js docs/architecture.md
 *     node markdown_linter.js --json docs/
 *     node markdown_linter.js --fix docs/
 *
 * Exit codes:
 *     0 — All clean
 *     1 — Errors found
 */

import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
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
// Fix functions
// ---------------------------------------------------------------------------

function fixTrailingWhitespace(lines, codeRanges) {
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) continue;
    if (i === 0 && lines[i].trim() === "---") continue;
    const trimmed = lines[i].replace(/[ \t]+$/, "");
    if (trimmed !== lines[i]) {
      lines[i] = trimmed;
      changed = true;
    }
  }
  return changed;
}

function fixTabs(lines, codeRanges) {
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) continue;
    if (lines[i].includes("\t")) {
      lines[i] = lines[i].replace(/\t/g, "  ");
      changed = true;
    }
  }
  return changed;
}

function fixCrlf(lines) {
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("\r")) {
      lines[i] = lines[i].replace(/\r/g, "");
      changed = true;
    }
  }
  return changed;
}

function fixFileEnding(lines) {
  let changed = false;
  // Remove trailing empty strings from split
  while (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
    changed = true;
  }
  if (lines.length === 0) return changed;
  // Collapse multiple trailing newlines to single
  let end = lines.length - 1;
  while (end > 0 && lines[end] === "") {
    end--;
  }
  lines.length = end + 1;
  return changed;
}

function fixSpacing(lines, codeRanges) {
  // Work on a copy
  lines = [...lines];

  // Find frontmatter range
  let fmOpen = -1;
  let fmClose = -1;
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    if (lines[i].trim() === "---" && insideCodeBlock(i, codeRanges) === false) {
      if (fmOpen === -1) fmOpen = i;
      else { fmClose = i; break; }
    }
  }

  // Collect content line indices (skip frontmatter block, code blocks, leading ---)
  const contentIndices = [];
  for (let i = 0; i < lines.length; i++) {
    if (insideCodeBlock(i, codeRanges)) continue;
    if (i === 0 && lines[i].trim() === "---") continue;
    if (fmOpen >= 0 && fmClose >= 0 && i >= fmOpen && i <= fmClose) continue;
    if (lines[i].trim() !== "") {
      contentIndices.push(i);
    }
  }

  if (contentIndices.length < 2) return null;

  let changed = false;

  // Determine spacing rules for each content line type
  function blanksNeededFor(idx) {
    const stripped = lines[idx].trim();
    if (/^##\s/.test(stripped)) return 2;
    if (/^###/.test(stripped)) return 1;
    if (/^(`{3,}|~{3,})\s*$/.test(stripped)) return 1;
    if (/^>\s/.test(stripped)) return 1;
    return 0; // paragraph or H1: no enforced minimum
  }

  // Fix blank-line region between consecutive content lines
  for (let ci = 0; ci < contentIndices.length - 1; ci++) {
    const prevIdx = contentIndices[ci];
    const nextIdx = contentIndices[ci + 1];
    const needed = blanksNeededFor(nextIdx);

    // Count actual blank lines between prevIdx and nextIdx
    let actualBlanks = 0;
    for (let i = prevIdx + 1; i < nextIdx; i++) {
      if (insideCodeBlock(i, codeRanges)) continue;
      if (lines[i].trim() === "") actualBlanks++;
    }

    let targetBlanks;
    if (needed > 0) {
      targetBlanks = Math.max(actualBlanks, needed);
    } else {
      // Paragraph-to-paragraph: collapse to 1 blank if more than 1
      targetBlanks = actualBlanks > 1 ? 1 : actualBlanks;
    }

    if (targetBlanks !== actualBlanks) {
      changed = true;
      // Remove ALL lines between prevIdx and nextIdx, then insert targetBlanks blank lines
      const rangeSize = nextIdx - prevIdx - 1;
      lines.splice(prevIdx + 1, rangeSize);
      for (let b = 0; b < targetBlanks; b++) {
        lines.splice(prevIdx + 1, 0, "");
      }
      // Shift subsequent content indices
      for (let k = ci + 1; k < contentIndices.length; k++) {
        contentIndices[k] += (targetBlanks - actualBlanks);
      }
    }
  }

  // Fix trailing blank lines at end of file
  while (lines.length > 1 && lines[lines.length - 1] === "") {
    lines.pop();
    changed = true;
  }

  if (!changed) return null;
  return lines;
}

function fixMarkdown(text, lines, codeRanges) {
  // Work on a copy of lines
  lines = [...lines];

  // Fix CRLF first (before splitting issues)
  fixCrlf(lines);

  // Fix trailing whitespace
  fixTrailingWhitespace(lines, codeRanges);

  // Fix tabs
  fixTabs(lines, codeRanges);

  // Fix spacing — returns new lines array
  const spacedLines = fixSpacing(lines, codeRanges);
  if (spacedLines) lines = spacedLines;

  // Fix file ending
  fixFileEnding(lines);

  // Rejoin with \n and ensure single trailing newline
  return lines.join("\n") + "\n";
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
      errors.push({ message: `Trailing whitespace on line ${i + 1}`, fixable: true });
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
      errors.push({ message: `Tab character found on line ${i + 1}`, fixable: true });
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
        errors.push({
          message: `Expected 2 blank lines before H2 heading (found ${blanksSincePrev}). Line ${i + 1}: '${stripped}'`,
          fixable: true,
        });
      } else if (isH3Plus && blanksSincePrev < 1) {
        const hMatch = stripped.match(/^(#+)/);
        const hLevel = hMatch ? hMatch[1].length : 3;
        errors.push({
          message: `Expected 1 blank line before H${hLevel} heading (found ${blanksSincePrev}). Line ${i + 1}: '${stripped}'`,
          fixable: true,
        });
      } else if (isCodeFence && blanksSincePrev < 1) {
        errors.push({
          message: `Expected 1 blank line before code block. Line ${i + 1}: '${stripped}'`,
          fixable: true,
        });
      } else if (isBlockquote && blanksSincePrev < 1) {
        errors.push({
          message: `Expected 1 blank line before blockquote. Line ${i + 1}: '${stripped}'`,
          fixable: true,
        });
      } else if (!isH2 && !isH3Plus && !isCodeFence && !isBlockquote) {
        if (blanksSincePrev > 1) {
          errors.push({
            message: `Expected 1 blank line between paragraphs (found ${blanksSincePrev}). Line ${i + 1}: '${stripped}'`,
            fixable: true,
          });
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
        errors.push({ message: `Code block without language tag at line ${i + 1}`, fixable: false });
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
        errors.push({ message: `Non-dash bullet character on line ${i + 1}`, fixable: false });
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
      errors.push({ message: `Non-dash bullet on line ${i + 1}: '${stripped}'`, fixable: false });
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
        errors.push({ message: `Missing section summary after H2 heading. Line ${i + 1}: '${headingText}'`, fixable: false });
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
    results.push({ severity: "error", message: `Could not read file: ${err}`, line: 0, file: path, fixable: false });
    return results;
  }

  // Encoding checks (errors)
  const bomErr = checkBom(raw);
  if (bomErr) {
    results.push({ severity: "error", message: bomErr, line: 0, file: path, fixable: false });
  }

  const leErr = checkLineEndings(text);
  if (leErr) {
    results.push({ severity: "error", message: leErr, line: 0, file: path, fixable: true });
  }

  const feErr = checkFileEnding(text);
  if (feErr) {
    results.push({ severity: "error", message: feErr, line: 0, file: path, fixable: true });
  }

  // Strip lint suppression directives before content checks
  const textStripped = stripLintDirectives(text);

  const lines = textStripped.split("\n");
  const codeRanges = findCodeRanges(lines);

  // Frontmatter check
  const fmErr = checkFrontmatter(textStripped);
  if (fmErr) {
    results.push({ severity: "error", message: fmErr, line: 0, file: path, fixable: false });
  }

  // Heading checks
  for (const hErr of checkHeadings(lines, codeRanges)) {
    results.push({ severity: "error", message: hErr, line: 0, file: path, fixable: false });
  }

  // Whitespace checks
  for (const twErr of checkTrailingWhitespace(lines, codeRanges)) {
    results.push({ severity: "error", message: twErr.message, line: 0, file: path, fixable: twErr.fixable });
  }

  for (const tabErr of checkTabs(lines, codeRanges)) {
    results.push({ severity: "error", message: tabErr.message, line: 0, file: path, fixable: tabErr.fixable });
  }

  for (const spErr of checkSpacing(lines, codeRanges)) {
    results.push({ severity: "error", message: spErr.message, line: 0, file: path, fixable: spErr.fixable });
  }

  // Code block checks
  for (const w of checkCodeBlocksNoLang(lines, codeRanges)) {
    results.push({ severity: "error", message: w.message, line: 0, file: path, fixable: w.fixable });
  }

  for (const w of checkNonDashBullets(lines, codeRanges)) {
    results.push({ severity: "error", message: w.message, line: 0, file: path, fixable: w.fixable });
  }

  for (const w of checkMissingSectionSummary(lines, codeRanges)) {
    results.push({ severity: "error", message: w.message, line: 0, file: path, fixable: w.fixable });
  }

  return results;
}


function lintAll(paths, jsonOutput = false, fixMode = false) {
  const files = collectMdFiles(paths);

  if (files.length === 0) {
    console.error("No .md files found.");
    return 0;
  }

  const allResults = [];
  const fixes = [];
  for (const f of files) {
    const results = lintMarkdown(f);
    allResults.push(...results);

    // Check if fixes can be applied
    if (fixMode) {
      const fixableResults = results.filter((r) => r.fixable);
      if (fixableResults.length > 0) {
        const { raw, text, error } = readFileSyncSafe(f);
        if (!error) {
          const textStripped = stripLintDirectives(text);
          const lines = textStripped.split("\n");
          const codeRanges = findCodeRanges(lines);
          const fixed = fixMarkdown(text, lines, codeRanges);
          // Verify fix actually changed something
          if (fixed !== text) {
            fixes.push({ path: f, content: fixed });
          }
        }
      }
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(allResults, null, 2));
    const errors = allResults.filter((r) => r.severity === "error");
    return errors.length > 0 ? 1 : 0;
  }

  // Text output
  if (fixMode) {
    // In fix mode, apply fixes and report
    let filesModified = 0;
    let filesSkipped = 0;
    let totalErrors = 0;

    for (const f of files) {
      const fileResults = allResults.filter((r) => r.file === f);
      const fixableCount = fileResults.filter((r) => r.fixable).length;
      const unfixableCount = fileResults.filter((r) => !r.fixable).length;
      totalErrors += fileResults.length;

      const fixEntry = fixes.find((x) => x.path === f);
      if (fixEntry) {
        writeFileSync(f, fixEntry.content, "utf-8");
        console.log(`  FIXED ${f} — ${fixableCount} fix(es)`);
        filesModified++;
      } else if (fileResults.length > 0) {
        console.log(`  SKIPPED ${f} — ${unfixableCount} unfixable error(s)`);
        filesSkipped++;
      } else {
        console.log(`  OK ${f}`);
      }
    }

    if (totalErrors > 0) {
      console.log();
      console.log(`Results: ${filesModified} fixed, ${filesSkipped} skipped, ${totalErrors} total error(s)`);
    }

    return totalErrors > 0 ? 1 : 0;
  }

  // Non-fix mode: report fixable vs unfixable
  let errorCount = 0;
  let fixableCount = 0;
  let unfixableCount = 0;

  // Group results by file
  const byFile = {};
  for (const r of allResults) {
    if (!byFile[r.file]) byFile[r.file] = [];
    byFile[r.file].push(r);
  }

  for (const r of allResults) {
    errorCount++;
    if (r.fixable) fixableCount++;
    else unfixableCount++;
  }

  if (errorCount > 0) {
    // Print all errors
    for (const r of allResults) {
      console.log(`  ERROR: ${r.file} - ${r.message}`);
    }

    console.log();

    if (unfixableCount > 0) {
      console.log(`${unfixableCount} unfixable error(s)`);
    }
    if (fixableCount > 0) {
      console.log(`${fixableCount} fixable error(s) — can be fixed with: node scripts/markdown_linter.js --fix`);
    }
  }

  return errorCount > 0 ? 1 : 0;
}


// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

function main() {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");
  const fixMode = args.includes("--fix");
  const paths = args.filter((a) => !a.startsWith("--"));

  const exitCode = lintAll(paths, jsonOutput, fixMode);
  process.exit(exitCode);
}

main();
