import { describe, it, expect } from "vitest";

import { THEME_DEFAULTS, flattenTheme } from "./defaults.js";

describe("defaults", () => {
  it("flattenTheme produces valid CSS custom property names", () => {
    const flat = flattenTheme(THEME_DEFAULTS);
    for (const key of Object.keys(flat)) {
      expect(key).toMatch(/^--/);
      expect(key).not.toMatch(/\s/);
    }
  });

  it("flattenTheme preserves all tokens with non-empty values", () => {
    const flat = flattenTheme(THEME_DEFAULTS);
    for (const [key, value] of Object.entries(flat)) {
      expect(value).toBeTruthy();
      expect(typeof value).toBe("string");
    }
  });

  it("THEME_DEFAULTS contains all expected categories", () => {
    const expectedCategories = ["bg", "text", "accent", "status", "mode", "button", "surfaces"];
    for (const category of expectedCategories) {
      expect(THEME_DEFAULTS).toHaveProperty(category);
      expect(Object.keys(THEME_DEFAULTS[category]).length).toBeGreaterThan(0);
    }
  });
});
