import { MODE_CONFIG, WORKFLOW_MODES, DEFAULT_WORKFLOW } from "../components/vue/chatHelpers.js";

const activeWorkflowModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
const modes = Object.entries(MODE_CONFIG)
  .filter(([id]) => activeWorkflowModes.includes(id))
  .map(([id, cfg]) => ({ id, label: cfg.label, symbol: cfg.symbol }));

export function optionsHandler(_, res) {
  res.json({ modes, currentMode: activeWorkflowModes[0] });
}
