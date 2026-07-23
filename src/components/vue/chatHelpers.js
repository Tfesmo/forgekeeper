export const MODE_CONFIG = {
  advisor: { symbol: "\u2728", color: "var(--mode-advisor)", label: "Advisor" },
  architect: { symbol: "\u2699", color: "var(--mode-architect)", label: "Architect" },
  implementer: { symbol: "\u270d", color: "var(--mode-implementer)", label: "Implementer" },
  reviewer: { symbol: "\u2714", color: "var(--mode-reviewer)", label: "Reviewer" },
  analyst: { symbol: "\u24c8", color: "var(--mode-analyst)", label: "Analyst" },
};

export const WORKFLOW_MODES = {
  coding: ["analyst", "implementer"],
  // review: ["reviewer", "analyst"],
  // planning: ["architect", "advisor"],
  // advisory: ["advisor", "analyst"],
};

export const DEFAULT_WORKFLOW = "coding";

const USER_LABEL = { symbol: "\u25c6", color: "white", label: "You" };

/**
 * Maps an LLM message role to its display mode.
 * User messages return "user". All other roles use the provided display mode.
 */
export function resolveDisplayMode(role, displayMode) {
  if (role === "user") return "user";
  return displayMode || "analyst";
}

/**
 * Looks up display configuration for a message mode.
 */
export function getMessageLabel(mode, currentMode) {
  if (mode === "user") {
    return USER_LABEL;
  }
  const displayMode = resolveDisplayMode(mode, currentMode);
  return MODE_CONFIG[displayMode] || { symbol: "", color: "white", label: displayMode };
}

/**
 * Returns the symbol for a message mode.
 */
export function getModeSymbol(mode, currentMode) {
  return getMessageLabel(mode, currentMode).symbol;
}

/**
 * Returns the label for a message mode.
 */
export function getModeLabel(mode, currentMode) {
  return getMessageLabel(mode, currentMode).label;
}

/**
 * Extracts the display mode from a message.
 * User messages always display as "user".
 * All other messages use forgekeeper.mode if present, otherwise fall back to fallbackMode.
 */
export function getMessageDisplayMode(msg, fallbackMode) {
  if (msg.role === "user") return "user";
  return msg.forgekeeper?.mode || fallbackMode;
}

/**
 * Formats milliseconds to a human-readable string.
 * < 1s: "Xms" (e.g. "500ms")
 * < 10s: "X.Xs" (e.g. "3.2s")
 * < 60s: "XX.Xs" (e.g. "45.3s")
 * >= 60s: "Xm Ys" (e.g. "2m 30s")
 */
export function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

/**
 * Determines if the thinking indicator should be shown for a message.
 * Shows when: isStreaming is true, message is assistant, no content yet.
 */
export function showThinkingIndicator(msg, isStreaming) {
  return Boolean(
    isStreaming &&
    msg.role === "assistant" &&
    !msg.content
  );
}

/**
 * Determines if the "thought" indicator should be shown for a message.
 * Shows when: isStreaming is true, message is assistant, has reasoning_content, and content has started.
 */
export function showThoughtIndicator(msg, isStreaming) {
  return Boolean(
    isStreaming &&
    msg.role === "assistant" &&
    msg.reasoning_content &&
    msg.content
  );
}
