import path from "node:path";
import { fileURLToPath } from "url";

import { Router, static as serveStatic } from "express";

import { optionsHandler } from "./options.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const router = Router();

router.get("/options", optionsHandler);

router.get("/", (_, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "dist", "index.html"));
});

router.get("/theme-settings", (_, res) => {
  res.sendFile(path.join(PROJECT_ROOT, "dist", "theme-settings.html"));
});

router.use(serveStatic(path.join(PROJECT_ROOT, "dist")));

export { router as uiRoutes };
