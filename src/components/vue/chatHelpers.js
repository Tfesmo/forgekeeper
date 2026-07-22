export const MODE_CONFIG = {
  advisor: { symbol: "\u2728", color: "yellow", label: "Advisor" },
  architect: { symbol: "\u2699", color: "cyan", label: "Architect" },
  implementer: { symbol: "\u270d", color: "green", label: "Implementer" },
  reviewer: { symbol: "\u2714", color: "magenta", label: "Reviewer" },
  analyst: { symbol: "\u24c8", color: "blue", label: "Analyst" },
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
 * Assistant messages are displayed under the current agent mode.
 */
export function resolveDisplayMode(mode, currentMode) {
  if (mode === "user") return "user";
  if (mode === "assistant") return currentMode;
  return mode;
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
