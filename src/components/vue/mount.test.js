import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Vue app mount", () => {
  it("built JS must contain createApp().mount('#app') call", () => {
    const distDir = path.join(__dirname, "..", "..", "..", "dist", "assets");
    const files = fs.readdirSync(distDir);
    const jsFiles = files.filter((f) => f.endsWith(".js"));
    expect(jsFiles.length).toBeGreaterThan(0);

    for (const file of jsFiles) {
      const content = fs.readFileSync(path.join(distDir, file), "utf-8");
      expect(content).toContain("createApp");
      expect(content).toMatch(/\.mount\(['"`]#app['"`]\)/);
    }
  });
});
