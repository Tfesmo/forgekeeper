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
 * < 10s: "X.Xs" (e.g. "3.2s")
 * >= 10s: "X.XXm" (e.g. "1.50m")
 */
export function formatMs(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 10000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(2)}m`;
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
