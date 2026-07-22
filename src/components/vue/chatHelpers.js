export const ROLE_CONFIG = {
  advisor: { symbol: "\u2728", color: "yellow", label: "Advisor" },
  architect: { symbol: "\u2699", color: "cyan", label: "Architect" },
  implementer: { symbol: "\u270d", color: "green", label: "Implementer" },
  reviewer: { symbol: "\u2714", color: "magenta", label: "Reviewer" },
  analyst: { symbol: "\u24c8", color: "blue", label: "Analyst" },
};

export const WORKFLOW_ROLES = {
  coding: ["analyst", "implementer"],
  // review: ["reviewer", "analyst"],
  // planning: ["architect", "advisor"],
  // advisory: ["advisor", "analyst"],
};

export const DEFAULT_WORKFLOW = "coding";

const USER_LABEL = { symbol: "\u25c6", color: "white", label: "You" };

/**
 * Maps an LLM message role to its display role.
 * Assistant messages are displayed under the current agent role.
 */
export function resolveDisplayRole(role, currentRole) {
  if (role === "user") return "user";
  if (role === "assistant") return currentRole;
  return role;
}

/**
 * Looks up display configuration for a message role.
 */
export function getMessageLabel(role, currentRole) {
  if (role === "user") {
    return USER_LABEL;
  }
  const displayRole = resolveDisplayRole(role, currentRole);
  return ROLE_CONFIG[displayRole] || { symbol: "", color: "white", label: displayRole };
}

/**
 * Returns the symbol for a message role.
 */
export function getRoleSymbol(role, currentRole) {
  return getMessageLabel(role, currentRole).symbol;
}

/**
 * Returns the label for a message role.
 */
export function getRoleLabel(role, currentRole) {
  return getMessageLabel(role, currentRole).label;
}
