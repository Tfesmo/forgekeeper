<script setup>
import { ref, onMounted } from "vue";

import { THEME_DEFAULTS, THEME_LIGHT, THEME_MODES, flattenTheme } from "../../themes/defaults.js";
import {
  applyTheme,
  saveUserOverrides,
  getUserOverrides,
  getThemeMode,
  setThemeMode,
  resetUserOverrides,
} from "../../themes/manager.js";

const themeMode = ref(getThemeMode());
const currentTheme = ref(null);
const activeCategory = ref("bg");
const allCategories = ["bg", "text", "accent", "status", "mode", "button", "surfaces"];

const mockMessages = [
  {
    role: "user",
    content: "What's the best way to structure a React project for a large team?",
  },
  {
    role: "assistant",
    content:
      "For a large React project, I recommend a feature-based structure where each feature contains its own components, hooks, and tests. This approach improves scalability and team coordination.",
  },
  {
    role: "assistant",
    reasoning_content:
      "Let me think about the key considerations: team size, feature complexity, code reuse patterns, and testing strategies. A feature-based structure addresses all of these.",
  },
  {
    role: "user",
    content: "Can you show me a concrete example of such a structure?",
  },
  {
    role: "assistant",
    content:
      "Here's a practical example:\n\nsrc/\n  features/\n    auth/\n      components/\n        Login.jsx\n        Register.jsx\n      hooks/\n        useAuth.js\n      tests/\n        Login.test.jsx\n    dashboard/\n      components/\n        Widget.jsx\n        Chart.jsx\n      hooks/\n        useMetrics.js\n  shared/\n    components/\n    hooks/\n    utils/\n  app.jsx\n  index.jsx",
  },
];

function getThemeForMode(mode) {
  if (mode === THEME_MODES.light) return THEME_LIGHT;
  return THEME_DEFAULTS;
}

function initTheme() {
  const mode = getThemeMode();
  const baseTheme = getThemeForMode(mode);
  const overrides = getUserOverrides();
  currentTheme.value = JSON.parse(JSON.stringify(baseTheme));
  applyTheme(overrides, mode);
}

onMounted(() => {
  initTheme();
});

function pickColor(category, key) {
  const input = document.getElementById(`picker-${category}-${key}`);
  if (input) input.showPicker();
}

function handleColorChange(category, key, value) {
  if (!currentTheme.value[category]) {
    currentTheme.value[category] = {};
  }
  currentTheme.value[category][key] = value;
  applyTheme(currentTheme.value, themeMode.value);
}

function saveChanges() {
  saveUserOverrides(currentTheme.value);
}

function resetChanges() {
  const mode = getThemeMode();
  const baseTheme = getThemeForMode(mode);
  currentTheme.value = JSON.parse(JSON.stringify(baseTheme));
  resetUserOverrides();
}

function switchMode(mode) {
  if (mode === themeMode.value) return;
  setThemeMode(mode);
  themeMode.value = mode;
  const baseTheme = getThemeForMode(mode);
  currentTheme.value = JSON.parse(JSON.stringify(baseTheme));
  activeCategory.value = "bg";
}

function getLabel(category, key) {
  const labels = {
    bg: {
      primary: "Primary BG",
      secondary: "Secondary BG",
      tertiary: "Tertiary BG",
    },
    text: {
      primary: "Primary Text",
      secondary: "Secondary Text",
      muted: "Muted Text",
      dim: "Dim Text",
      veryDim: "Very Dim Text",
      white: "White",
      thinking: "Thinking",
    },
    accent: {
      blue: "Blue",
      focus: "Focus",
      submit: "Submit",
      submitHover: "Submit Hover",
    },
    status: {
      error: "Error",
      errorBg: "Error BG",
      warning: "Warning",
      success: "Success",
    },
    mode: {
      analyst: "Analyst",
      architect: "Architect",
      advisor: "Advisor",
      implementer: "Implementer",
      reviewer: "Reviewer",
    },
    button: {
      submit: "Submit",
      submitHover: "Submit Hover",
      submitDisabled: "Submit Disabled",
      submitDisabledText: "Submit Disabled Text",
      abort: "Abort",
      abortHover: "Abort Hover",
      abortDisabled: "Abort Disabled",
      abortDisabledText: "Abort Disabled Text",
    },
    surfaces: {
      messageItem: "Message Item",
      reasoningContent: "Reasoning BG",
      emptyState: "Empty State",
      usageBadge: "Usage Badge",
      usageBadgeBorder: "Usage Badge Border",
    },
  };
  return labels[category]?.[key] || key;
}

function getCategoryTokens(category) {
  if (!currentTheme.value) return {};
  return currentTheme.value[category] || {};
}
</script>

<template>
  <div class="theme-settings">
    <div class="settings-header">
      <h1>Theme Settings</h1>
      <div class="mode-switcher">
        <button :class="['mode-btn', { active: themeMode === 'dark' }]" @click="switchMode('dark')">
          Dark
        </button>
        <button
          :class="['mode-btn', { active: themeMode === 'light' }]"
          @click="switchMode('light')"
        >
          Light
        </button>
      </div>
    </div>

    <div class="settings-body">
      <div class="category-sidebar">
        <button
          v-for="cat in allCategories"
          :key="cat"
          :class="['cat-btn', { active: activeCategory === cat }]"
          @click="activeCategory = cat"
        >
          {{ cat }}
        </button>
      </div>

      <div class="color-palette">
        <div
          v-for="(value, key) in getCategoryTokens(activeCategory)"
          :key="key"
          class="color-item"
        >
          <label class="color-label">{{ getLabel(activeCategory, key) }}</label>
          <div class="color-picker-row">
            <input
              :id="`picker-${activeCategory}-${key}`"
              type="color"
              :value="value"
              @input="handleColorChange(activeCategory, key, $event.target.value)"
              class="color-input"
            />
            <button class="pick-btn" @click="pickColor(activeCategory, key)">Pick</button>
            <span class="color-value">{{ value }}</span>
          </div>
        </div>
      </div>
    </div>

    <div class="settings-footer">
      <button class="save-btn" @click="saveChanges">Save</button>
      <button class="reset-btn" @click="resetChanges">Reset</button>
    </div>

    <div class="preview-section">
      <h2>Preview</h2>
      <div class="preview-messages">
        <div v-for="(msg, idx) in mockMessages" :key="idx" :class="['preview-msg', msg.role]">
          <span class="msg-role">{{ msg.role }}</span>
          <div class="msg-content">{{ msg.content }}</div>
          <div v-if="msg.reasoning_content" class="msg-reasoning">
            {{ msg.reasoning_content }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.theme-settings {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.settings-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
}

.settings-header h1 {
  font-size: 1.3em;
  color: var(--text-primary);
}

.mode-switcher {
  display: flex;
  gap: 4px;
}

.mode-btn {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9em;
  transition:
    background 0.3s,
    color 0.3s;
}

.mode-btn.active {
  background: var(--accent-blue);
  color: var(--text-primary);
}

.settings-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.category-sidebar {
  width: 160px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--bg-tertiary);
  padding: 12px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cat-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  font-size: 0.9em;
  transition:
    background 0.3s,
    color 0.3s;
}

.cat-btn.active {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.color-palette {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.color-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.color-label {
  font-size: 0.85em;
  color: var(--text-muted);
  font-weight: 500;
}

.color-picker-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-input {
  width: 40px;
  height: 32px;
  border: 1px solid var(--bg-tertiary);
  border-radius: 4px;
  cursor: pointer;
  background: none;
  padding: 2px;
}

.pick-btn {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85em;
  transition:
    background 0.3s,
    color 0.3s;
}

.pick-btn:hover {
  background: var(--accent-blue);
  color: var(--text-primary);
}

.color-value {
  font-family: monospace;
  font-size: 0.85em;
  color: var(--text-dim);
}

.settings-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px 24px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--bg-tertiary);
}

.save-btn {
  background: var(--accent-blue);
  color: var(--text-primary);
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s;
}

.save-btn:hover {
  background: var(--accent-submit-hover);
}

.reset-btn {
  background: var(--bg-tertiary);
  color: var(--text-muted);
  border: none;
  padding: 8px 20px;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s;
}

.reset-btn:hover {
  background: var(--text-verydim);
  color: var(--text-primary);
}

.preview-section {
  max-height: 300px;
  overflow-y: auto;
  padding: 20px 24px;
  border-top: 1px solid var(--bg-tertiary);
}

.preview-section h2 {
  font-size: 1em;
  color: var(--text-muted);
  margin-bottom: 12px;
}

.preview-messages {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-msg {
  padding: 12px 16px;
  border-radius: 8px;
  border: 1px solid var(--bg-tertiary);
}

.preview-msg.user {
  background: var(--surfaces-message-item);
}

.preview-msg.assistant {
  background: var(--bg-tertiary);
}

.msg-role {
  font-size: 0.75em;
  color: var(--text-dim);
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.msg-content {
  color: var(--text-primary);
  font-size: 0.9em;
  line-height: 1.5;
  white-space: pre-wrap;
}

.msg-reasoning {
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--surfaces-reasoning-content);
  border-radius: 4px;
  color: var(--text-muted);
  font-size: 0.85em;
  font-style: italic;
  line-height: 1.4;
}
</style>
