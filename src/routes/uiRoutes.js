import { Router, static as serveStatic } from "express";
import path from "node:path";
import { fileURLToPath } from "url";
import { ROLE_CONFIG, WORKFLOW_ROLES, DEFAULT_WORKFLOW } from "../components/vue/chatHelpers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const router = Router();

const activeWorkflowRoles = WORKFLOW_ROLES[DEFAULT_WORKFLOW];

const roles = Object.entries(ROLE_CONFIG)
  .filter(([id]) => activeWorkflowRoles.includes(id))
  .map(([id, cfg]) => ({ id, label: cfg.label, symbol: cfg.symbol }));

router.get("/options", (_, res) => {
  res.json({ roles, currentRole: activeWorkflowRoles[0] });
});

router.get("/", (_, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "dist", "index.html"));
});

router.use(serveStatic(path.join(PROJECT_ROOT, "dist")));

export { router as uiRoutes };
