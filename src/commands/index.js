import { echoi } from "./echoi.js";
import { passthrough } from "./passthrough.js";

export const COMMANDS = {
  help: () =>
    "Available commands:\n" +
    "  /help          - Show this help message\n" +
    "  /settings      - Open settings editor\n" +
    "  /echoi <text>  - Echo test message\n" +
    "  /passthrough <text> - Passthrough test message",
  settings: () => "(opens settings editor)",
  echoi,
  passthrough,
};

export function dispatchCommand(name, args) {
  const handler = COMMANDS[name];
  if (!handler) return `[unknown command: /${name}]`;
  if (name === "help" || name === "settings") return handler();
  return handler(args);
}
