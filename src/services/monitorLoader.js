import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function loadMonitors() {
  const monitorsDir = path.join(__dirname, "..", "monitors");
  const monitors = [];
  if (fs.existsSync(monitorsDir)) {
    for (const file of fs.readdirSync(monitorsDir)) {
      if (!file.endsWith(".js")) continue;
      try {
        const mod = await import(pathToFileURL(path.join(monitorsDir, file)).href);
        if (typeof mod.start === "function") {
          monitors.push({
            name: file.replace(".js", ""),
            start: mod.start,
            stop: mod.stop || (() => {}),
          });
        }
      } catch (err) {
        console.error(`[server] Failed to load monitor ${file}:`, err.message);
      }
    }
  }
  return monitors;
}
