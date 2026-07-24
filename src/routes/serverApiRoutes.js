import { Router } from "express";

import { optionsHandler } from "./options.js";

const serverApiRouter = Router();

serverApiRouter.get("/options", optionsHandler);

export { serverApiRouter };
