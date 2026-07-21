import { readFileSync } from "node:fs";

import { load } from "js-yaml";

const uiConfig = load(readFileSync(new URL("./ui.yml", import.meta.url), "utf8"));

export function getRoleConfig(role) {
  return uiConfig.roles?.[role] || { symbol: "", color: "white", label: role };
}

export const uiConfigExport = uiConfig;
