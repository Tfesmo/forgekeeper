// Theme defaults - dark mode
// All colors are CSS custom property values (without -- prefix)
// Structure: category -> tokenName -> hex/rgba value

export const THEME_DEFAULTS = {
  bg: {
    primary: "#0f0f1a",
    secondary: "#1a1a2e",
    tertiary: "#2d2d4e",
  },
  text: {
    primary: "#f0f0f5",
    secondary: "#e0e0e0",
    muted: "#a0a0b0",
    dim: "#808090",
    veryDim: "#606080",
    white: "#ffffff",
  },
  accent: {
    blue: "#4080e0",
    focus: "#7eb8da",
    submit: "#4a9eff",
    submitHover: "#3a8eef",
  },
  status: {
    error: "#ff6b6b",
    errorBg: "rgba(255, 107, 107, 0.1)",
    disabled: "#2d2d4e",
  },
  mode: {
    advisor: "#e0e040",
    architect: "#40e0e0",
    implementer: "#40c040",
    reviewer: "#c040e0",
    analyst: "#4080e0",
  },
  button: {
    submit: "#4a9eff",
    submitHover: "#3a8eef",
    submitDisabled: "#2d2d4e",
    submitDisabledText: "#606080",
    abort: "#d13d13",
    abortHover: "#b02a12",
    abortDisabled: "#2d2d4e",
    abortDisabledText: "#606080",
  },
  surfaces: {
    messageItem: "rgba(255, 255, 255, 0.03)",
    reasoningContent: "rgba(255, 255, 255, 0.02)",
    emptyState: "#c0c0d0",
    usageBadge: "#7eb8da",
    usageBadgeBorder: "rgba(126, 184, 218, 0.2)",
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
