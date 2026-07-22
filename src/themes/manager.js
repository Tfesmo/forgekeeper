import { THEME_DEFAULTS, flattenTheme } from "./defaults.js";

const STORAGE_KEY = "forgekeeper-theme-overrides";

function loadUserOverrides() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] !== undefined &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

export function applyTheme(overrides = {}) {
  const merged = deepMerge(THEME_DEFAULTS, overrides);
  const flat = flattenTheme(merged);

  const root = document.documentElement;
  for (const [prop, value] of Object.entries(flat)) {
    root.style.setProperty(prop, value);
  }
}

export function saveUserOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // localStorage full or unavailable
  }
}

export function getUserOverrides() {
  return loadUserOverrides();
}

export function resetUserOverrides() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
  applyTheme();
}
