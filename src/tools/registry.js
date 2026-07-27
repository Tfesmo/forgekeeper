import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "node:url";
import { join } from "path";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const TOOLS_CONFIG_PATH = join(__dirname, "..", "..", ".forgekeeper", "tools.json");

/**
 * Loads and parses .forgekeeper/tools.json.
 * Returns { tools: {}, mcp: {} } or empty objects if not found.
 */
export function loadToolsConfig() {
  if (!existsSync(TOOLS_CONFIG_PATH)) {
    console.warn("[tools] .forgekeeper/tools.json not found, using empty config");
    return { tools: {}, mcp: {} };
  }

  try {
    const raw = readFileSync(TOOLS_CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    return {
      tools: config.tools || {},
      mcp: config.mcp || {},
    };
  } catch (err) {
    console.error("[tools] Failed to parse .forgekeeper/tools.json:", err.message);
    return { tools: {}, mcp: {} };
  }
}

/**
 * Builds an OpenAI-compatible tools array from the config.
 * Each tool becomes a { type: "function", function: { name, description, parameters } }.
 */
export function getToolsSchema() {
  const { tools } = loadToolsConfig();
  const result = [];

  for (const [name, config] of Object.entries(tools)) {
    const params = config.params || {};
    const properties = {};
    const required = [];

    for (const [key, def] of Object.entries(params)) {
      properties[key] = {
        type: def.type || "string",
        description: def.description || `Parameter ${key}`,
      };
      if (def.required) {
        required.push(key);
      }
    }

    result.push({
      type: "function",
      function: {
        name,
        description: config.description || `${name} tool`,
        parameters: {
          type: "object",
          properties,
          required: required.length > 0 ? required : undefined,
        },
      },
    });
  }

  return result;
}
