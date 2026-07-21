import { getRoleConfig } from "../config/ui.js";

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
 * Returns { symbol, color, label } for rendering.
 */
export function getMessageLabel(role, currentRole) {
  if (role === "user") {
    return { symbol: "\u25c6", color: "white", label: "You" };
  }
  const displayRole = resolveDisplayRole(role, currentRole);
  return getRoleConfig(displayRole);
}

/**
 * Scrolls the ScrollView by a delta amount.
 * Respects shift-held state (text selection mode).
 */
export function handleScroll(delta, scrollRef, shiftHeldRef) {
  if (shiftHeldRef.current) return;
  if (!scrollRef.current) return;
  scrollRef.current.scrollBy(delta);
}

/**
 * Scrolls the ScrollView to the bottom.
 */
export function scrollToBottom(scrollRef) {
  if (!scrollRef.current) return;
  scrollRef.current.scrollToBottom();
}
