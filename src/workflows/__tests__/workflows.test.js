import { describe, it, expect } from "vitest";

import {
  WORKFLOW_ROLES,
  WORKFLOW_NAME,
  WORKFLOW_DEFAULT,
  WORKFLOW_LABELS,
  WORKFLOW_PROMPTS,
  WORKFLOW_ORDER,
  cycleWorkflow,
} from "../../workflows.js";

describe("workflows constants", () => {
  it("should have correct WORKFLOW_ROLES", () => {
    expect(WORKFLOW_ROLES.analyst).toBe("analyst");
    expect(WORKFLOW_ROLES.implementer).toBe("implementer");
  });

  it("should have correct WORKFLOW_DEFAULT", () => {
    expect(WORKFLOW_DEFAULT).toBe(WORKFLOW_ROLES.analyst);
  });

  it("should have correct WORKFLOW_LABELS", () => {
    expect(WORKFLOW_LABELS.analyst).toBe("Analyst");
    expect(WORKFLOW_LABELS.implementer).toBe("Implementer");
  });

  it("should have WORKFLOW_NAME set to 'Coding'", () => {
    expect(WORKFLOW_NAME).toBe("Coding");
  });

  it("should have WORKFLOW_ORDER with both roles in correct order", () => {
    expect(WORKFLOW_ORDER).toEqual(["analyst", "implementer"]);
  });

  it("should have WORKFLOW_PROMPTS for both roles", () => {
    expect(WORKFLOW_PROMPTS.analyst).toContain("Analyst mode");
    expect(WORKFLOW_PROMPTS.analyst).toContain("Do not make code changes");
    expect(WORKFLOW_PROMPTS.implementer).toContain("Implementer mode");
    expect(WORKFLOW_PROMPTS.implementer).toContain("Write clean, functional code");
  });
});

describe("cycleWorkflow", () => {
  it("should cycle from analyst to implementer", () => {
    expect(cycleWorkflow("analyst")).toBe("implementer");
  });

  it("should cycle from implementer back to analyst", () => {
    expect(cycleWorkflow("implementer")).toBe("analyst");
  });

  it("should cycle repeatedly", () => {
    let role = "analyst";
    const cycle1 = cycleWorkflow(role);
    role = cycle1;
    const cycle2 = cycleWorkflow(role);
    role = cycle2;
    const cycle3 = cycleWorkflow(role);

    expect(cycle1).toBe("implementer");
    expect(cycle2).toBe("analyst");
    expect(cycle3).toBe("implementer");
  });
});
