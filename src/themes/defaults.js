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
    primary: "#0d0d1a",
    secondary: "#12121f",
    tertiary: "#252540",
  },
  text: {
    // Text hierarchy: primary → veryDim (decreasing prominence)
    primary: "#f5f5fa",
    secondary: "#e5e5ea",
    muted: "#b0b0c0",
    dim: "#656580",
    veryDim: "#707080",
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
    analyst: "#2563eb",
    architect: "#0891b2",
    advisor: "#d97706",
    implementer: "#16a34a",
    reviewer: "#9333ea",
  },
  button: {
    // Button states: submit (primary), abort (danger)
    submit: "#3b82f6",
    submitHover: "#2563eb",
    submitDisabled: "#252540",
    submitDisabledText: "#757590",
    abort: "#b91c1c",
    abortHover: "#991b1b",
    abortDisabled: "#252540",
    abortDisabledText: "#757590",
  },
  surfaces: {
    // Surface/background fills: cards, badges, panels
    messageItem: "rgba(255, 255, 255, 0.03)",
    reasoningContent: "rgba(255, 255, 255, 0.04)",
    emptyState: "#656575",
    usageBadge: "#3b82f6",
    usageBadgeBorder: "rgba(59, 130, 246, 0.25)",
  },
  git: {
    // Git status: branch text, clean indicator, dirty indicator, unstaged count, untracked count
    branch: "#b0b0c0",
    clean: "#22c55e",
    dirty: "#ef4444",
    unstaged: "#eab308",
    untracked: "#3b82f6",
  },
};

// Theme defaults - light mode
export const THEME_LIGHT = {
  bg: {
    primary: "#f9f9fb",
    secondary: "#ffffff",
    tertiary: "#e0e0e8",
  },
  text: {
    primary: "#08080e",
    secondary: "#1c1c2c",
    muted: "#606070",
    dim: "#5a5a6e",
    veryDim: "#707080",
    white: "#ffffff",
    thinking: "#B45309",
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
    warning: "#b45309",
    success: "#15803d",
  },
  mode: {
    analyst: "#1e40af",
    architect: "#0e7490",
    advisor: "#b45309",
    implementer: "#15803d",
    reviewer: "#7e22ce",
  },
  button: {
    submit: "#2563eb",
    submitHover: "#1d4ed8",
    submitDisabled: "#e0e0e8",
    submitDisabledText: "#b0b0c0",
    abort: "#b91c1c",
    abortHover: "#991b1b",
    abortDisabled: "#e0e0e8",
    abortDisabledText: "#b0b0c0",
  },
  surfaces: {
    messageItem: "rgba(255, 255, 255, 0.03)",
    reasoningContent: "rgba(255, 255, 255, 0.04)",
    emptyState: "#707080",
    usageBadge: "#3b82f6",
    usageBadgeBorder: "rgba(59, 130, 246, 0.25)",
  },
  git: {
    branch: "#757590",
    clean: "#16a34a",
    dirty: "#dc2626",
    unstaged: "#d97706",
    untracked: "#2563eb",
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
