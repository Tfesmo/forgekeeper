<script setup>
import { ref, onMounted, onBeforeUnmount } from "vue";

import { getThemeMode, setThemeMode } from "../../themes/manager.js";
import ChatView from "./ChatView.vue";
import Header from "./Header.vue";

const DEFAULT_TOKEN_LIMIT = 64000;

const themeMode = ref(getThemeMode());

function toggleTheme() {
  const newMode = themeMode.value === "dark" ? "light" : "dark";
  setThemeMode(newMode);
  themeMode.value = newMode;
}

const TELEMETRY_RESET = {};
const telemetryData = ref({});
const tokenStats = ref({ used: 0, total: DEFAULT_TOKEN_LIMIT });
let telemetrySource = null;

function onTokensUpdated(e) {
  tokenStats.value = e;
}

onMounted(() => {
  telemetrySource = new EventSource("/api/stream");
  telemetrySource.addEventListener("progress", (e) => {
    const data = JSON.parse(e.data);
    telemetryData.value.progress = data;
  });
  telemetrySource.addEventListener("draft_rate", (e) => {
    const data = JSON.parse(e.data);
    telemetryData.value.draft_rate = data;
  });
  telemetrySource.addEventListener("memory", (e) => {
    const data = JSON.parse(e.data);
    telemetryData.value.memory = data;
  });
  telemetrySource.onerror = (e) => {
    if (telemetrySource.reconnectPolicy !== false) {
      telemetryData.value = TELEMETRY_RESET;
    }
    console.error("[App.vue] telemetry EventSource error:", e);
  };
});

onBeforeUnmount(() => {
  if (telemetrySource) {
    telemetrySource.close();
    telemetrySource = null;
  }
});
</script>

<template>
  <div class="app-container">
    <Header
      :telemetry-data="telemetryData"
      :tokens-used="tokenStats.used"
      :tokens-total="tokenStats.total"
      :theme-mode="themeMode"
      :toggle-theme="toggleTheme"
    />
    <ChatView @tokens-updated="onTokensUpdated" />
  </div>
</template>

<style>
html,
body,
#app {
  height: 100%;
  margin: 0;
  padding: 0;
  font-family: "JetBrains Mono", monospace;
}

.app-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}
</style>
