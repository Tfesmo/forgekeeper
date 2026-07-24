<script setup>
defineProps({
  telemetryData: { type: Object, required: true },
  tokensUsed: { type: Number, required: true },
  tokensTotal: { type: Number, required: true },
  themeMode: { type: String, required: true },
  toggleTheme: { type: Function, required: true },
});

function formatMemory(bytes) {
  if (bytes >= 1073741824) {
    return (bytes / 1073741824).toFixed(1) + " GB";
  }
  return Math.round(bytes / 1048576) + " MB";
}

function formatTokens(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "M";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}
</script>

<template>
  <div class="chat-header">
    <div class="header-left">
      <h1 class="app-title">Forgekeeper</h1>
      <div class="header-actions">
        <button
          class="theme-toggle"
          @click="toggleTheme"
          :title="themeMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          {{ themeMode === "dark" ? "☀" : "☾" }}
        </button>
        <a href="/theme-settings" target="_blank" class="theme-toggle" title="Theme settings">⚙</a>
      </div>
    </div>
    <div class="header-right">
      <div class="telemetry-wrapper">
        <div class="telemetry-badge" title="Pure server RSS memory — excludes browser memory">
          <span class="telemetry-compact">
            {{ telemetryData.memory ? formatMemory(telemetryData.memory.rss) : "— " }}
          </span>
        </div>
        <span class="telemetry-separator">·</span>
        <div
          class="telemetry-badge"
          title="Progress: how far through the current operation | Draft acceptance rate: percentage of draft tokens accepted by the LLM"
        >
          <span class="telemetry-compact" v-if="telemetryData.progress || telemetryData.draft_rate">
            <span
              :title="`Progress: ${(telemetryData.progress?.fields?.progress * 100).toFixed(1)}%`"
            >
              {{
                telemetryData.progress
                  ? (telemetryData.progress.fields?.progress * 100).toFixed(0) + "%"
                  : "—"
              }}
            </span>
            <span class="telemetry-separator">·</span>
            <span
              :title="`Draft acceptance: ${(telemetryData.draft_rate?.fields?.acceptance_rate * 100).toFixed(1)}%`"
            >
              {{
                telemetryData.draft_rate
                  ? (telemetryData.draft_rate.fields?.acceptance_rate * 100).toFixed(1) + "%"
                  : "—"
              }}
            </span>
          </span>
          <span class="telemetry-compact" v-else>—</span>
        </div>
      </div>
      <div class="token-counter">
        <span class="token-values"
          >[ {{ formatTokens(tokensUsed) }} / {{ formatTokens(tokensTotal) }} ]</span
        >
        <span class="token-percent">{{ ((tokensUsed / tokensTotal) * 100).toFixed(2) }}%</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.2em;
  color: var(--text-muted);
  padding: 4px 8px;
  border-radius: 4px;
  transition:
    color 0.3s,
    background 0.3s;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
}

.theme-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.app-title {
  font-size: 1.5em;
  color: var(--text-secondary);
}

.token-counter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.token-values {
  color: var(--text-muted);
  font-family: monospace;
}

.token-percent {
  color: var(--accent-focus);
  font-weight: bold;
  font-family: monospace;
}

.telemetry-wrapper {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
}

.telemetry-badge {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
  font-family: monospace;
  font-size: 0.85em;
  white-space: nowrap;
  user-select: none;
}

.telemetry-badge:hover {
  background: var(--bg-tertiary);
}

.telemetry-compact {
  color: var(--text-muted);
}

.telemetry-separator {
  color: var(--text-dim);
  padding: 0 2px;
}
</style>
