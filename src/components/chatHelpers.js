import { getRoleConfig } from "../config/ui.js";
import { COMMANDS } from "../commands/index.js";

/**
 * Height of the input area (workflow name + input line + token usage line).
 */
export const INPUT_AREA_HEIGHT = 3;

/**
 * Padding columns reserved for input prefix and symbols.
 */
export const INPUT_PADDING_COLUMNS = 36;

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

/**
 * Builds the refs object passed to the centralized input handler.
 * Collects all mutable state and callbacks into a single object
 * for the key handler to avoid passing many individual props.
 */
export function buildInputRefs(refs, props) {
  return {
    isInquirer: refs.isInquirerRef.current,
    scrollRef: refs.scrollRef,
    shiftHeldRef: refs.shiftHeldRef,
    scrollTimerRef: refs.scrollTimerRef,
    scrollSpeedRef: refs.scrollSpeedRef,
    inputRef: refs.inputRef,
    historyIndexRef: refs.historyIndexRef,
    userMessagesHistoryRef: refs.userMessagesHistoryRef,
    stdout: refs.stdout,
    onCommand: props.onCommand,
    onSubmit: props.onSubmit,
    handleSettings: refs.handleSettings,
    currentRole: refs.currentRole,
    setCurrentRole: refs.setCurrentRole,
    onRoleToggle: props.onRoleToggle,
    setInput: props.setInput,
    getCommandNames: () =>
      Object.keys(COMMANDS).filter((n) => n !== "help" && n !== "settings"),
  };
}
