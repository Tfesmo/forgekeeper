import { mkdirSync } from "node:fs";

import { QdrantClient } from "@qdrant/js-client-rest";
import { pipeline } from "@xenova/transformers";

const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "forgekeeper-project";
const VECTOR_NAME = "fast-all-minilm-l6-v2";
const EMBEDDING_MODEL = "Xenova/all-MiniLM-L6-v2";

let embedderCache = null;

function getQdrantClient() {
  return new QdrantClient({ url: QDRANT_URL, checkCompatibility: false });
}

async function getEmbedder() {
  if (embedderCache) return embedderCache;
  const cacheDir = process.env.XDG_CACHE_HOME
    ? `${process.env.XDG_CACHE_HOME}/forgekeeper/transformers`
    : `${process.env.HOME}/.cache/forgekeeper/transformers`;
  try {
    mkdirSync(cacheDir, { recursive: true });
  } catch {}
  embedderCache = await pipeline("feature-extraction", EMBEDDING_MODEL, { cacheDir });
  return embedderCache;
}

async function embedText(text) {
  const embedder = await getEmbedder();
  const result = await embedder(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

/**
 * Handler for the qdrant_find tool.
 * Performs a vector similarity search against the ingested knowledge base.
 */
export async function qdrantFindHandler(args) {
  console.log("[qdrant] qdrantFindHandler called with:", JSON.stringify(args));

  const query = args?.query;
  if (!query) {
    throw new Error("Missing required parameter: query");
  }

  try {
    const client = getQdrantClient();
    const embedding = await embedText(query);
    const results = await client.search(QDRANT_COLLECTION, {
      vector: { name: VECTOR_NAME, vector: embedding },
      limit: 5,
    });

    const formatted = results.map((point, i) => {
      const payload = point.payload || {};
      return {
        index: i + 1,
        score: point.score?.toFixed(4),
        text: payload.text || payload.document || "(no text)",
        file: payload.file || payload.source || "unknown",
        headers: payload.headers || "",
      };
    });

    const output = formatted
      .map(
        (f) =>
          `## ${f.index}. [${f.file}] (score: ${f.score})\n${f.text}${f.headers ? `\n> Headers: ${f.headers}` : ""}`,
      )
      .join("\n\n---\n\n");

    console.log("[qdrant] qdrantFindHandler returned", results.length, "results");
    return output || "No results found.";
  } catch (err) {
    console.error("[qdrant] qdrantFindHandler error:", err.message);
    throw new Error(`Qdrant search failed: ${err.message}`);
  }
}
