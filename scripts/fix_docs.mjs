#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, basename } from "node:path";

const target = process.argv[2] || "./docs";
const isDir = statSync(target).isDirectory();

let files = [];
if (isDir) {
  files = readdirSync(target).filter((f) => f.endsWith(".md")).map((f) => join(target, f));
} else {
  files = [target];
}

for (const filePath of files) {
  let content = readFileSync(filePath, "utf-8");

  // Fix 1: Ensure file ends with exactly one newline
  if (content.length === 0 || content[content.length - 1] !== "\n") {
    content += "\n";
  }

  // Fix 2: Add YAML frontmatter if missing
  const stripped = content.replace(/^\n+/, "");
  if (!stripped.startsWith("---\n") && !stripped.startsWith("---\r")) {
    const title = basename(filePath, ".md").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    const fm = `---\ntitle: '${title}'\n---\n\n`;
    content = fm + content;
  }

  // Process line by line
  const lines = content.split("\n");
  const result = [];
  let inCodeFence = false;
  let inFrontmatter = false;
  let frontmatterEnded = false;
  let blankCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isBlank = trimmed === "";
    const isH2 = /^##\s/.test(trimmed) && !/^###/.test(trimmed);
    const isH3Plus = /^###/.test(trimmed);
    const isCloseFence = /^(`{3,}|~{3,})\s*$/.test(trimmed);
    const fenceOpen = /^(`{3,}|~{3,})/.exec(trimmed);
    const isBareFence = !!fenceOpen;

    // Track frontmatter state
    if (!frontmatterEnded && trimmed === "---") {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        inFrontmatter = false;
        frontmatterEnded = true;
      }
      while (blankCount > 0) { result.push(""); blankCount--; }
      result.push(line);
      continue;
    }

    // Handle code fences (only after frontmatter)
    if (!inCodeFence && isBareFence) {
      inCodeFence = true;
      while (blankCount > 0) { result.push(""); blankCount--; }
      const fenceLen = fenceOpen[1].length;
      const rest = trimmed.slice(fenceLen).trim();
      if (rest === "" || !/^\w/.test(rest)) {
        const fenceChar = fenceOpen[1][0];
        result.push(fenceChar.repeat(fenceLen) + " text");
      } else {
        result.push(line);
      }
      continue;
    }
    if (inCodeFence && isCloseFence) {
      inCodeFence = false;
      while (blankCount > 0) { result.push(""); blankCount--; }
      result.push(line);
      continue;
    }
    if (inCodeFence) {
      while (blankCount > 0) { result.push(""); blankCount--; }
      result.push(line);
      continue;
    }

    // Skip frontmatter lines - preserve as-is
    if (inFrontmatter) {
      while (blankCount > 0) { result.push(""); blankCount--; }
      result.push(line);
      continue;
    }

    // Accumulate blank lines
    if (isBlank) {
      blankCount++;
      continue;
    }

    // Non-blank line reached
    if (blankCount > 0) {
      let blanksNeeded = 1;
      if (isH2) blanksNeeded = 2;
      else if (isH3Plus) blanksNeeded = 1;

      for (let b = 0; b < blanksNeeded; b++) {
        result.push("");
      }
      blankCount = 0;
    }

    result.push(line);
  }

  // Flush trailing blanks
  while (blankCount > 0) { result.push(""); blankCount--; }

  content = result.join("\n");

  writeFileSync(filePath, content);
  console.log("Fixed:", filePath);
}

console.log("Done.");
