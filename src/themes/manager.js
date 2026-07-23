import { THEME_DEFAULTS, THEME_LIGHT, THEME_MODES, flattenTheme } from "./defaults.js";

const STORAGE_KEY = "forgekeeper-theme-overrides";
const MODE_KEY = "forgekeeper-theme-mode";

const THEME_MAP = {
  [THEME_MODES.dark]: THEME_DEFAULTS,
  [THEME_MODES.light]: THEME_LIGHT,
};

function loadUserOverrides() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

function loadThemeMode() {
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored && THEME_MAP[stored]) return stored;
  } catch {
    // localStorage unavailable
  }
  return THEME_MODES.dark;
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

export function getThemeMode() {
  return loadThemeMode();
}

export function setThemeMode(mode) {
  if (!THEME_MAP[mode]) return;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
  applyTheme(loadUserOverrides(), mode);
}

export function applyTheme(overrides = {}, mode = getThemeMode()) {
  const baseTheme = THEME_MAP[mode] || THEME_DEFAULTS;
  const merged = deepMerge(baseTheme, overrides);
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
  applyTheme(loadUserOverrides(), getThemeMode());
}
