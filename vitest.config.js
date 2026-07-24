import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [react(), vue()],
  test: {
    globals: true,
    include: ["src/**/*.test.{js,jsx,ts,tsx}"],
  },
});
