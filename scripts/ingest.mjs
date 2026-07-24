#!/usr/bin/env node
/**
 * ingest.mjs — Ingest linted markdown files into Qdrant with manifest-based deduplication.
 *
 * Usage:
 *     node scripts/ingest.mjs
 *     node scripts/ingest.mjs docs/
 *     node scripts/ingest.mjs docs/architecture.md
 *     node scripts/ingest.mjs --force
 *
 * Replaces scripts/ingest.py using Node.js + LangChain JS ecosystem.
 *
 * Dependencies:
 *   @langchain/textsplitters — MarkdownHeaderTextSplitter
 *   @xenova/transformers — local ONNX embeddings (all-MiniLM-L6-v2)
 *   @qdrant/js-client-rest — Qdrant client for collection management + upsert
 */

import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import * as yaml from "js-yaml";

import { QdrantClient } from "@qdrant/js-client-rest";
import { pipeline } from "@xenova/transformers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const QDRANT_URL = "http://localhost";
const QDRANT_PORT = 6333;
const COLLECTION_NAME = "forgekeeper-project";
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";
const VECTOR_NAME = "fast-all-minilm-l6-v2";
const VECTOR_SIZE = 384;
const MANIFEST_PATH = join(__dirname, "..", "data", ".ingest_manifest.json");


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sha256Text(text) {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

function loadManifest() {
  try {
    const raw = readFileSync(MANIFEST_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveManifest(manifest) {
  const dir = dirname(MANIFEST_PATH);
  const fs = await import("node:fs");
  fs.mkdirSync(dir, { recursive: true, force: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf-8");
}

function collectFiles(inputs) {
  const files = [];
  const seen = new Set();

  function walkDir(dir) {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isFile() && entry.endsWith(".md")) {
        const rel = fullPath;
        if (!seen.has(rel)) {
          seen.add(rel);
          files.push(rel);
        }
      } else if (stat.isDirectory()) {
        walkDir(fullPath);
      }
    }
  }

  for (const arg of inputs) {
    const resolved = resolve(arg);
    try {
      const stat = statSync(resolved);
      if (stat.isFile() && resolved.endsWith(".md")) {
        if (!seen.has(resolved)) {
          seen.add(resolved);
          files.push(resolved);
        }
      } else if (stat.isDirectory()) {
        walkDir(resolved);
      } else {
        console.error(`Skipping non-markdown file: ${arg}`);
      }
    } catch {
      // skip unreadable paths
    }
  }

  return files.sort();
}


// ---------------------------------------------------------------------------
// Embedding pipeline (cached singleton)
// ---------------------------------------------------------------------------

let embedderCache = null;

async function getEmbedder() {
  if (embedderCache) return embedderCache;
  const cacheDir = join(__dirname, "..", ".cache", "transformers");
  const fs = await import("node:fs");
  try {
    fs.mkdirSync(cacheDir, { recursive: true });
  } catch {}
  embedderCache = await pipeline("feature-extraction", EMBEDDING_MODEL, {
    cacheDir,
  });
  return embedderCache;
}

// Split markdown content by H1-H4 headers, mimicking Python MarkdownHeaderTextSplitter
function splitByHeaders(content) {
  const lines = content.split("\n");
  const headerRegex = /^(#{1,4})\s+(.+)$/;
  const chunks = [];
  let currentHeader = {};
  let currentLines = [];
  let currentLevel = 0;

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headerRegex);
    if (match) {
      const level = match[1].length;
      const title = match[2].trim();

      // If we have content and this is a new header, save the previous chunk
      if (currentLines.length > 0) {
        const text = currentLines.join("\n").trim();
        if (text) {
          chunks.push({ pageContent: text, metadata: { ...currentHeader } });
        }
      }

      // Start new chunk
      currentLevel = level;
      currentHeader = {};
      const key = "h" + level;
      currentHeader[key] = title;

      // Include this header line in the chunk
      currentLines = [lines[i]];
    } else {
      currentLines.push(lines[i]);
    }
  }

  // Don't forget the last chunk
  if (currentLines.length > 0) {
    const text = currentLines.join("\n").trim();
    if (text) {
      chunks.push({ pageContent: text, metadata: { ...currentHeader } });
    }
  }

  return chunks;
}


// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

async function ingestFile(filePath) {
  const rawText = readFileSync(filePath, "utf-8");
  let post;
  let contentText;

  // Try to parse frontmatter
  const dashLine = "---";
  const firstDash = rawText.indexOf(dashLine);
  if (firstDash !== -1 && firstDash < 10) {
    const afterFirstDash = rawText.slice(firstDash + 3);
    const secondDash = afterFirstDash.indexOf(dashLine);
    if (secondDash !== -1) {
      const fmContent = afterFirstDash.slice(0, secondDash);
      try {
        post = yaml.load(fmContent);
      } catch {
        post = {};
      }
      contentText = afterFirstDash.slice(secondDash + 3);
    } else {
      post = {};
      contentText = rawText;
    }
  } else {
    post = {};
    contentText = rawText;
  }

  const metadata = post.metadata || {};
  if (!post.content) {
    // js-yaml doesn't extract content — use our parsed contentText
  }

  const chunks = splitByHeaders(contentText);

  const embedder = await getEmbedder();

  const points = [];
  for (const chunk of chunks) {
    const text = chunk.pageContent;
    const headerMeta = chunk.metadata || {};

    const combinedMetadata = {
      source: basename(filePath),
      filetype: "markdown",
      document: text,
      ...metadata,
      ...Object.fromEntries(
        Object.entries(headerMeta).filter(([, v]) => v)
      ),
    };

    const embedding = await embedder(text, {
      pooling: "mean",
      normalize: true,
    });

    const { v4: uuidv4 } = await import("uuid");
    points.push({
      id: uuidv4(),
      vector: { [VECTOR_NAME]: Array.from(embedding.data) },
      payload: combinedMetadata,
    });
  }

  return points;
}

async function deleteBySource(client, sourceFilename) {
  const scrollResult = await client.scroll(COLLECTION_NAME, {
    limit: 1000,
    filter: {
      must: [
        {
          key: "source",
          match: { value: sourceFilename },
        },
      ],
    },
  });
  if (scrollResult.points && scrollResult.points.length > 0) {
    const ids = scrollResult.points.map((p) => p.id);
    await client.delete(COLLECTION_NAME, {
      points: ids,
    });
  }
}

async function ensureCollection(client) {
  const collections = await client.getCollections();
  const exists = collections.collections.some((c) => c.name === COLLECTION_NAME);
  if (exists) return;

  await client.createCollection(COLLECTION_NAME, {
    vectors: {
      [VECTOR_NAME]: {
        size: VECTOR_SIZE,
        distance: "Cosine",
      },
    },
  });
}

async function processFile(filePath, client, manifest, force) {
  const relPath = filePath;

  try {
    statSync(filePath);
  } catch {
    if (relPath in manifest) {
      console.log(`File removed from disk: ${relPath}`);
      await deleteBySource(client, basename(filePath));
      delete manifest[relPath];
      console.log(`  Deleted Qdrant points for ${basename(filePath)}`);
    }
    return;
  }

  const rawText = readFileSync(filePath, "utf-8");

  // Check skip_ingest flag in frontmatter (always takes priority, even with --force)
  const firstDash = rawText.indexOf("---");
  if (firstDash !== -1 && firstDash < 10) {
    const afterFirstDash = rawText.slice(firstDash + 3);
    const secondDash = afterFirstDash.indexOf("---");
    if (secondDash !== -1) {
      const fmContent = afterFirstDash.slice(0, secondDash);
      try {
        const fm = yaml.load(fmContent);
        if (fm && fm.skip_ingest) {
          console.log(`SKIPPED ${relPath} (skip_ingest: true)`);
          if (relPath in manifest) {
            await deleteBySource(client, basename(filePath));
            console.log(`  Deleted Qdrant points for ${basename(filePath)}`);
            delete manifest[relPath];
          }
          return;
        }
      } catch {
        // YAML parse error - continue with normal processing
      }
    }
  }

  const currentHash = sha256Text(rawText);
  const storedHash = manifest[relPath];

  if (!force && storedHash === currentHash) {
    console.log(`SKIPPED ${relPath} (unchanged)`);
    return;
  }

  if (force) {
    console.log(`FORCE ${relPath}`);
  } else if (storedHash) {
    console.log(`CHANGED ${relPath}`);
    await deleteBySource(client, basename(filePath));
    console.log(`  Deleted old Qdrant points for ${basename(filePath)}`);
  } else {
    console.log(`NEW ${relPath}`);
  }

  const points = await ingestFile(filePath);
  if (!points.length) {
    console.error(`  No chunks produced for ${relPath}`);
    return;
  }

  await client.upsert(COLLECTION_NAME, { points });

  manifest[relPath] = currentHash;
  console.log(`  Ingested ${points.length} chunks`);
}


// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");

  // Collect inputs: positional args + --directory values
  const dirIndex = args.indexOf("--directory");
  let inputs = args.filter((a) => !a.startsWith("--"));
  if (dirIndex !== -1) {
    const dirArgs = args.slice(dirIndex + 1);
    inputs = inputs.concat(dirArgs);
  }

  if (!inputs.length) {
    inputs = ["docs"];
  }

  const files = collectFiles(inputs);
  if (!files.length) {
    console.error("No .md files found.");
    process.exit(1);
  }

  console.log(`Ingesting ${files.length} file(s)...`);

  const manifest = loadManifest();
  const client = new QdrantClient({ url: `${QDRANT_URL}:${QDRANT_PORT}` });

  await ensureCollection(client);

  for (const filePath of files) {
    await processFile(filePath, client, manifest, force);
  }

  await saveManifest(manifest);
  console.log(`\nManifest saved to ${MANIFEST_PATH}`);
}

main().catch((err) => {
  console.error("Ingestion failed:", err);
  process.exit(1);
});
