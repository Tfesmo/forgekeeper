export const MODE_CONFIG = {
  advisor: { symbol: "\u2728", color: "var(--mode-advisor)", label: "Advisor" },
  architect: { symbol: "\u2699", color: "var(--mode-architect)", label: "Architect" },
  implementer: { symbol: "\u270d", color: "var(--mode-implementer)", label: "Implementer" },
  reviewer: { symbol: "\u2714", color: "var(--mode-reviewer)", label: "Reviewer" },
  analyst: { symbol: "\u24c8", color: "var(--mode-analyst)", label: "Analyst" },
};

export const WORKFLOW_MODES = {
  coding: ["analyst", "implementer"],
  // review: ["reviewer", "analyst"],
  // planning: ["architect", "advisor"],
  // advisory: ["advisor", "analyst"],
};

export const DEFAULT_WORKFLOW = "coding";
