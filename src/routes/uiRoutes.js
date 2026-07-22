import path from "node:path";
import { fileURLToPath } from "url";

import { Router, static as serveStatic } from "express";

import { MODE_CONFIG, WORKFLOW_MODES, DEFAULT_WORKFLOW } from "../components/vue/chatHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const router = Router();

const activeWorkflowModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];

const modes = Object.entries(MODE_CONFIG)
  .filter(([id]) => activeWorkflowModes.includes(id))
  .map(([id, cfg]) => ({ id, label: cfg.label, symbol: cfg.symbol }));

router.get("/options", (_, res) => {
  res.json({ modes, currentMode: activeWorkflowModes[0] });
});

router.get("/", (_, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "dist", "index.html"));
});

router.use(serveStatic(path.join(PROJECT_ROOT, "dist")));

export { router as uiRoutes };
