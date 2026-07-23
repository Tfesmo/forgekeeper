// Theme defaults - dark mode
// All colors are CSS custom property values (without -- prefix)
// Structure: category -> tokenName -> hex/rgba value

export const THEME_MODES = {
  dark: "dark",
  light: "light",
};

export const THEME_DEFAULTS = {
  bg: {
    // Background layers: primary (main), secondary (panels), tertiary (borders)
    primary: "#0a0a16",
    secondary: "#12121f",
    tertiary: "#252540",
  },
  text: {
    // Text hierarchy: primary → veryDim (decreasing prominence)
    primary: "#f5f5fa",
    secondary: "#e5e5ea",
    muted: "#b0b0c0",
    dim: "#9090a0",
    veryDim: "#757590",
    white: "#ffffff",
    thinking: "#FBBF24",
  },
  accent: {
    // Brand interactive colors: base → hover
    blue: "#3b82f6",
    focus: "#93c5fd",
    submit: "#3b82f6",
    submitHover: "#2563eb",
  },
  status: {
    // System states: error, warning, success, disabled
    error: "#ef4444",
    errorBg: "rgba(239, 68, 68, 0.12)",
    warning: "#f59e0b",
    success: "#22c55e",
  },
  mode: {
    // Role-specific UI colors (mode labels, borders)
    analyst: "#3b82f6",
    architect: "#06b6d4",
    advisor: "#eab308",
    implementer: "#22c55e",
    reviewer: "#a855f7",
  },
  button: {
    // Button states: submit (primary), abort (danger)
    submit: "#3b82f6",
    submitHover: "#2563eb",
    submitDisabled: "#252540",
    submitDisabledText: "#757590",
    abort: "#dc2626",
    abortHover: "#b91c1c",
    abortDisabled: "#252540",
    abortDisabledText: "#757590",
  },
  surfaces: {
    // Surface/background fills: cards, badges, panels
    messageItem: "rgba(0, 0, 0, 0.04)",
    reasoningContent: "rgba(0, 0, 0, 0.02)",
    emptyState: "#9090a0",
    usageBadge: "#3b82f6",
    usageBadgeBorder: "rgba(59, 130, 246, 0.25)",
  },
};

// Theme defaults - light mode
export const THEME_LIGHT = {
  bg: {
    primary: "#f5f5fa",
    secondary: "#ffffff",
    tertiary: "#e0e0e8",
  },
  text: {
    primary: "#0a0a16",
    secondary: "#252540",
    muted: "#757590",
    dim: "#9090a0",
    veryDim: "#b0b0c0",
    white: "#ffffff",
    thinking: "#D97706",
  },
  accent: {
    blue: "#2563eb",
    focus: "#3b82f6",
    submit: "#2563eb",
    submitHover: "#1d4ed8",
  },
  status: {
    error: "#dc2626",
    errorBg: "rgba(220, 38, 38, 0.1)",
    warning: "#d97706",
    success: "#16a34a",
  },
  mode: {
    analyst: "#2563eb",
    architect: "#0891b2",
    advisor: "#d97706",
    implementer: "#16a34a",
    reviewer: "#9333ea",
  },
  button: {
    submit: "#2563eb",
    submitHover: "#1d4ed8",
    submitDisabled: "#e0e0e8",
    submitDisabledText: "#b0b0c0",
    abort: "#dc2626",
    abortHover: "#b91c1c",
    abortDisabled: "#e0e0e8",
    abortDisabledText: "#b0b0c0",
  },
  surfaces: {
    messageItem: "rgba(0, 0, 0, 0.04)",
    reasoningContent: "rgba(0, 0, 0, 0.02)",
    emptyState: "#9090a0",
    usageBadge: "#3b82f6",
    usageBadgeBorder: "rgba(59, 130, 246, 0.25)",
  },
};

// Flatten structure for CSS variable generation
// e.g. bg.primary -> --bg-primary
export function flattenTheme(theme) {
  const flat = {};
  for (const [category, tokens] of Object.entries(theme)) {
    for (const [name, value] of Object.entries(tokens)) {
      flat[`--${category}-${name}`] = value;
    }
  }
  return flat;
}
