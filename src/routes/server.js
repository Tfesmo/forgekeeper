import { Router } from "express";

import { optionsHandler } from "./options.js";

const router = Router();

router.get("/options", optionsHandler);

export { router };
