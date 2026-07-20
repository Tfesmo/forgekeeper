#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");

const result = spawnSync("node", ["--import", "tsx/esm", join(projectRoot, "src/index.jsx")], {
  stdio: "inherit",
  cwd: projectRoot,
});

process.exit(result.status ?? 1);
