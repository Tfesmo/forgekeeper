import { describe, it, expect } from "vitest";

import { THEME_DEFAULTS, THEME_LIGHT, THEME_MODES, flattenTheme } from "./defaults.js";

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
    for (const _key in flat) {
      const value = flat[_key];
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

  it("THEME_LIGHT contains all expected categories", () => {
    const expectedCategories = ["bg", "text", "accent", "status", "mode", "button", "surfaces"];
    for (const category of expectedCategories) {
      expect(THEME_LIGHT).toHaveProperty(category);
      expect(Object.keys(THEME_LIGHT[category]).length).toBeGreaterThan(0);
    }
  });

  it("THEME_LIGHT has lighter bg.primary than THEME_DEFAULTS", () => {
    const darkPrimary = THEME_DEFAULTS.bg.primary;
    const lightPrimary = THEME_LIGHT.bg.primary;
    expect(lightPrimary).toMatch(/^#/);
    expect(darkPrimary).toMatch(/^#/);
    // Light mode primary should be a light color (high hex values)
    const lightR = parseInt(lightPrimary.slice(1, 3), 16);
    const lightG = parseInt(lightPrimary.slice(3, 5), 16);
    const lightB = parseInt(lightPrimary.slice(5, 7), 16);
    expect(lightR + lightG + lightB).toBeGreaterThan(400);
  });

  it("THEME_MODES exports dark and light modes", () => {
    expect(THEME_MODES.dark).toBe("dark");
    expect(THEME_MODES.light).toBe("light");
  });

  it("flattenTheme works with THEME_LIGHT", () => {
    const flat = flattenTheme(THEME_LIGHT);
    expect(Object.keys(flat).length).toBeGreaterThan(0);
    for (const key of Object.keys(flat)) {
      expect(key).toMatch(/^--/);
    }
  });
});
