export const LLM_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS, 10) || 60_000;
export const LLM_MODEL = process.env.LLM_MODEL || "qwen";
export const LLM_MAX_TOKENS = parseInt(process.env.LLM_MAX_TOKENS, 10) || 4096;
export const LLM_ENDPOINT = process.env.LLM_ENDPOINT || "http://localhost:8080";
