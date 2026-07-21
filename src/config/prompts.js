import { readFileSync } from "node:fs";

import { load } from "js-yaml";

const prompts = load(readFileSync(new URL("./prompts.yml", import.meta.url), "utf8"));

export const systemPrompt = prompts.system_prompt || "";
