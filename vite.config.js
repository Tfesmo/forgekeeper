import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  base: "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: [resolve(__dirname, "index.html"), resolve(__dirname, "theme-settings.html")],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/components/vue"),
    },
  },
});
