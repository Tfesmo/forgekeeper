import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [vue()],
  base: "/theme-assets/",
  build: {
    outDir: "dist/theme-assets",
    emptyOutDir: true,
    rollupOptions: {
      input: [resolve(__dirname, "src/components/vue/themeSettings.js")],
      output: [
        {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
        },
      ],
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src/components/vue"),
    },
  },
});
