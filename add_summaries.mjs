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

const summaries = {
  "2. Data Flow": "Describes how user input flows through the application components.",
  "6. Project Structure": "Overview of the directory layout and key files.",
  "2. System Prompt Config": "Configuration for the system prompt behavior.",
  "3. Agents.md": "Settings and behavior for agent configuration files.",
  "4. LLM Proxy Configuration": "Setup and configuration for the LLM proxy layer.",
  "1. Prerequisites": "Required setup steps before running the application.",
  "3. Running Locally": "Instructions for local development setup.",
  "5. Testing": "How to run and write tests for the project.",
  "6. Linting & Formatting": "Code style enforcement and formatting tools.",
  "7. Adding New Commands": "Guide for extending CLI commands.",
  "8. Adding New Components": "How to add new UI components to the project.",
  "Option 2: Log Monitoring": "Monitoring application logs for errors and issues.",
  "Option 3: Hash Chain": "Integrity verification using hash chains.",
  "Best Practices": "Recommended practices for writing Jinja prompt templates.",
  "Rules": "Core rules governing message behavior and validation.",
  "2. Notes Tools": "Available tools for managing notes in Forgekeeper.",
  "3. What Belongs in Notes": "Guidelines for content appropriate for notes.",
  "5. Note Permissions": "Access controls and permission settings for notes.",
  "7. Vector DB MCP": "Integration details for vector database MCP.",
  "1. Functions": "Guidelines for writing and organizing functions.",
  "2. Async/Await": "Best practices for asynchronous JavaScript code.",
  "3. Error Handling": "Strategies for handling errors in JavaScript.",
  "4. Imports and Exports": "Module import and export conventions.",
  "2. Full Workflow": "Complete development workflow overview.",
  "5. Reminder Prompt": "Configuration for reminder functionality.",
  "7. Permissions": "Permission and access control settings.",
  "2. Deduplication": "Strategies for eliminating duplicate content.",
  "3. Semantic Clarity": "Techniques for ensuring clear semantic meaning.",
  "4. Metadata Enrichment": "Adding metadata to improve content context.",
  "5. Noise Reduction": "Methods for filtering out unnecessary content.",
  "2. Phased Roadmap": "Multi-phase implementation roadmap.",
  "4. Completed": "List of completed roadmap items.",
  "1. Variable Naming": "Conventions for naming variables in the project.",
  "2. Constants and Immutables": "Rules for defining constants and immutable values.",
  "3. Comments": "Guidelines for writing effective code comments.",
  "4. Spacing and Indentation": "Code formatting rules for spacing.",
  "5. File Structure": "Organizational structure for project files.",
  "6. Imports and Exports": "Module import and export conventions.",
};

for (const filePath of files) {
  let content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const isH2 = /^##\s/.test(trimmed) && !/^###/.test(trimmed);

    result.push(line);

    if (isH2) {
      let searchIdx = i + 1;
      while (searchIdx < lines.length && lines[searchIdx].trim() === "") {
        searchIdx++;
      }
      if (searchIdx < lines.length) {
        const nextLine = lines[searchIdx].trim();
        const isH3Plus = /^###/.test(nextLine);
        const isList = /^[-*]\s/.test(nextLine) || /^\d+\.\s/.test(nextLine);

        if (isH3Plus || isList) {
          const summary = summaries[trimmed.replace(/^##\s*/, "")];
          if (summary) {
            result.push("");
            result.push(summary);
          }
        }
      }
    }
  }

  content = result.join("\n");

  writeFileSync(filePath, content);
  console.log("Added summaries:", filePath);
}

console.log("Done.");
