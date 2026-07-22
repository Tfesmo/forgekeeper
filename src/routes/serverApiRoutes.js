import path from "node:path";
import { fileURLToPath } from "url";

import { Router, static as serveStatic } from "express";

import { MODE_CONFIG, WORKFLOW_MODES, DEFAULT_WORKFLOW } from "../components/vue/chatHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const serverApiRouter = Router();
const activeWorkflowModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];

const modes = Object.entries(MODE_CONFIG)
  .filter(([id]) => activeWorkflowModes.includes(id))
  .map(([id, cfg]) => ({ id, label: cfg.label, symbol: cfg.symbol }));

serverApiRouter.get("/options", (_, res) => {
  res.json({ modes, currentMode: activeWorkflowModes[0] });
});

export { serverApiRouter };
