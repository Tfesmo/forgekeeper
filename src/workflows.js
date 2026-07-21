export const WORKFLOW_ROLES = {
  analyst: "analyst",
  implementer: "implementer",
};

export const WORKFLOW_NAME = "Coding";

export const WORKFLOW_DEFAULT = WORKFLOW_ROLES.analyst;

export const WORKFLOW_LABELS = {
  [WORKFLOW_ROLES.analyst]: "Analyst",
  [WORKFLOW_ROLES.implementer]: "Implementer",
};

export const WORKFLOW_PROMPTS = {
  [WORKFLOW_ROLES.analyst]:
    "You are in Analyst mode. Focus on investigation, analysis, and providing insights. Ask clarifying questions, explore options, and provide detailed reasoning. Do not make code changes or implement solutions directly.",
  [WORKFLOW_ROLES.implementer]:
    "You are in Implementer mode. Focus on building, modifying, and implementing code solutions. Write clean, functional code and make the necessary changes to fulfill the user's request.",
};

export const WORKFLOW_ORDER = [WORKFLOW_ROLES.analyst, WORKFLOW_ROLES.implementer];

export function cycleWorkflow(currentRole) {
  const index = WORKFLOW_ORDER.indexOf(currentRole);
  const nextIndex = (index + 1) % WORKFLOW_ORDER.length;
  return WORKFLOW_ORDER[nextIndex];
}
