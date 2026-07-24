import path from "node:path";
import { fileURLToPath } from "url";

import { Router, static as serveStatic } from "express";

import { optionsHandler } from "./options.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..", "..");

const serverApiRouter = Router();

serverApiRouter.get("/options", optionsHandler);

export { serverApiRouter };
