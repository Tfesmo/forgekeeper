import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock localStorage and document before importing manager
const mockLocalStorage = {};
const mockDocumentElementStyle = { setProperty: vi.fn() };
const mockDocumentElement = { style: mockDocumentElementStyle };

vi.stubGlobal("localStorage", {
  getItem: vi.fn((key) => mockLocalStorage[key] || null),
  setItem: vi.fn((key, value) => {
    mockLocalStorage[key] = value;
  }),
  removeItem: vi.fn((key) => {
    delete mockLocalStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
  }),
});

vi.stubGlobal("document", {
  documentElement: mockDocumentElement,
});

import {
  getThemeMode,
  setThemeMode,
  applyTheme,
  saveUserOverrides,
  getUserOverrides,
  resetUserOverrides,
} from "./manager.js";

describe("theme manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockLocalStorage).forEach((k) => delete mockLocalStorage[k]);
  });

  describe("getThemeMode", () => {
    it("returns dark by default", () => {
      const mode = getThemeMode();
      expect(mode).toBe("dark");
    });

    it("returns stored mode", () => {
      mockLocalStorage["forgekeeper-theme-mode"] = "light";
      const mode = getThemeMode();
      expect(mode).toBe("light");
    });

    it("returns dark for invalid stored mode", () => {
      mockLocalStorage["forgekeeper-theme-mode"] = "invalid";
      const mode = getThemeMode();
      expect(mode).toBe("dark");
    });
  });

  describe("setThemeMode", () => {
    it("stores light mode in localStorage", () => {
      setThemeMode("light");
      expect(localStorage.setItem).toHaveBeenCalledWith("forgekeeper-theme-mode", "light");
    });

    it("stores dark mode in localStorage", () => {
      setThemeMode("dark");
      expect(localStorage.setItem).toHaveBeenCalledWith("forgekeeper-theme-mode", "dark");
    });

    it("ignores invalid mode", () => {
      mockLocalStorage["forgekeeper-theme-mode"] = "light";
      setThemeMode("invalid");
      expect(localStorage.setItem).not.toHaveBeenCalled();
    });
  });

  describe("saveUserOverrides", () => {
    it("saves overrides to localStorage", () => {
      saveUserOverrides({ bg: { primary: "#ffffff" } });
      expect(localStorage.setItem).toHaveBeenCalledWith(
        "forgekeeper-theme-overrides",
        JSON.stringify({ bg: { primary: "#ffffff" } }),
      );
    });
  });

  describe("getUserOverrides", () => {
    it("returns empty object when no overrides stored", () => {
      const overrides = getUserOverrides();
      expect(overrides).toEqual({});
    });

    it("returns stored overrides", () => {
      localStorage.setItem(
        "forgekeeper-theme-overrides",
        JSON.stringify({ bg: { primary: "#ffffff" } }),
      );
      const overrides = getUserOverrides();
      expect(overrides).toEqual({ bg: { primary: "#ffffff" } });
    });
  });

  describe("resetUserOverrides", () => {
    it("removes overrides from localStorage", () => {
      mockLocalStorage["forgekeeper-theme-overrides"] = JSON.stringify({
        bg: { primary: "#ffffff" },
      });
      resetUserOverrides();
      expect(localStorage.removeItem).toHaveBeenCalledWith("forgekeeper-theme-overrides");
    });
  });

  describe("applyTheme", () => {
    it("sets CSS custom properties on documentElement", () => {
      applyTheme({ bg: { primary: "#ff0000" } });
      expect(mockDocumentElementStyle.setProperty).toHaveBeenCalledWith("--bg-primary", "#ff0000");
    });
  });
});
