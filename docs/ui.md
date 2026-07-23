---
title: "Theme System"
tags: [theme, ui, colors, css-variables]
topics: [theme-system, color-management, css-custom-properties]
keywords: [theme, colors, CSS variables, theme system, defaults, overrides]
summary: "Guidelines for the Forgekeeper theme system, including color categories, naming conventions, and user override mechanisms."
llm_hints: "Target audience: frontend developers working with Forgekeeper's UI. Covers the centralized theme system, how colors are structured and applied, and how to extend or customize the theme."
---

# Theme System

> **Purpose:** Rules for working with Forgekeeper's centralized theme system. All UI colors are managed through `src/themes/defaults.js` and applied as CSS custom properties at runtime.

This section covers the theme file structure, naming conventions, how to add colors, and the user override mechanism.

---


## Table of Contents

- [1. File Structure](#1-file-structure)
- [2. Color Categories](#2-color-categories)
- [3. Naming Convention](#3-naming-convention)
- [4. Using Colors in Components](#4-using-colors-in-components)
- [5. Adding a New Color](#5-adding-a-new-color)
- [6. User Overrides](#6-user-overrides)
- [7. Manager API](#7-manager-api)
- [8. Rules](#8-rules)

---


## 1. File Structure

The theme system consists of three files:

- `src/themes/defaults.js` — default color values organized by category
- `src/themes/manager.js` — applies merged theme to document as CSS custom properties
- `docs/ui.md` — this file

All colors are defined in `defaults.js` and applied to `:root` at startup via `applyTheme()`.

---


## 2. Color Categories

Colors are organized into categories. Each category contains semantic token names:

- `bg` — background colors (primary, secondary, tertiary)
- `text` — text colors (primary, secondary, muted, dim, veryDim, white, thinking)
- `accent` — interactive colors (blue, focus, submit, submitHover)
- `status` — system states (error, errorBg, warning, success)
- `mode` — role-specific colors (advisor, architect, implementer, reviewer, analyst)
- `button` — button colors (submit, submitHover, submitDisabled, submitDisabledText, abort, abortHover, abortDisabled, abortDisabledText)
- `surfaces` — UI surface backgrounds (messageItem, reasoningContent, emptyState, usageBadge, usageBadgeBorder)

---


## 3. Naming Convention

Category and token names are flattened to CSS variable names:

```text
bg.primary       → --bg-primary
text.thinking    → --text-thinking
accent.blue      → --accent-blue
```

---


## 4. Using Colors in Components

Reference colors via CSS variables in component styles. Always use `var(--category-token)` syntax.

```css
.my-element {
  color: var(--text-primary);
  background: var(--bg-secondary);
}
```

Never hardcode hex values in components. Always use CSS variables.

---


## 5. Adding a New Color

Add a token to the appropriate category in `defaults.js` and reference it in components. This keeps colors centralized and consistent across the UI.

1. Add the token to the appropriate category in `src/themes/defaults.js`.
2. Reference it in components via `var(--category-token)`.

Example:

```js
// defaults.js
status: {
  // existing...
  success: "#40c040",
}
```

```css
/* component */
.success-text {
  color: var(--status-success);
}
```

---


## 6. User Overrides

Users can persist customizations in `localStorage` under the key `forgekeeper-theme-overrides`. The stored object follows the same structure as `THEME_DEFAULTS`. The system deep-merges overrides before applying.

- `saveUserOverrides(overrides)` — persist changes
- `getUserOverrides()` — load saved overrides
- `resetUserOverrides()` — clear and restore defaults

---


## 7. Manager API

| Export | Purpose |
|---|---|
| `applyTheme(overrides)` | Merge defaults with overrides, inject CSS variables into `:root` |
| `saveUserOverrides(overrides)` | Write overrides to localStorage |
| `getUserOverrides()` | Load and parse saved overrides |
| `resetUserOverrides()` | Clear localStorage and reapply defaults |

---


## 8. Rules

These rules govern the theme system. Violating them introduces inconsistency into the UI.

- Never hardcode colors in components. Always use CSS variables.
- Use hex or rgba values in `defaults.js`. No CSS variables inside the theme file.
- Category names should be semantic and reusable across themes.
- Mode colors are reserved for role-specific UI elements (mode labels, border accents).
- Category comments in `defaults.js` explain the purpose of each category — read them before adding new tokens.
- Avoid duplicating colors across categories (e.g. don't put `#2d2d4e` in both `bg.tertiary` and `status.disabled`).
