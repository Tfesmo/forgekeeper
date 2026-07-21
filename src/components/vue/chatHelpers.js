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
    return { symbol: "\u25c6", color: "white", label: "You" };
  }
  const displayRole = resolveDisplayRole(role, currentRole);
  const roleConfig = {
    advisor: { symbol: "\u2728", color: "yellow", label: "Advisor" },
    architect: { symbol: "\u2699", color: "cyan", label: "Architect" },
    implementer: { symbol: "\u270d", color: "green", label: "Implementer" },
    reviewer: { symbol: "\u2714", color: "magenta", label: "Reviewer" },
    analyst: { symbol: "\u24c8", color: "blue", label: "Analyst" },
  };
  return roleConfig[displayRole] || { symbol: "", color: "white", label: displayRole };
}
