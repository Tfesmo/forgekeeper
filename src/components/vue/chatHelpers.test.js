import { describe, it, expect } from "vitest";
import { MODE_CONFIG, WORKFLOW_MODES, DEFAULT_WORKFLOW, getMessageLabel } from "./chatHelpers.js";

describe("chatHelpers", () => {
  it("MODE_CONFIG contains all five modes", () => {
    expect(Object.keys(MODE_CONFIG)).toEqual([
      "advisor",
      "architect",
      "implementer",
      "reviewer",
      "analyst",
    ]);
  });

  it.each(Object.keys(MODE_CONFIG))("mode '%s' has symbol, label, and color", (key) => {
    const mode = MODE_CONFIG[key];
    expect(mode.symbol).toBeTruthy();
    expect(mode.label).toBeTruthy();
    expect(mode.color).toBeTruthy();
  });

  it("WORKFLOW_MODES includes the default workflow with enabled modes", () => {
    expect(WORKFLOW_MODES).toHaveProperty(DEFAULT_WORKFLOW);
    const activeModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
    expect(Array.isArray(activeModes)).toBe(true);
    expect(activeModes.length).toBeGreaterThan(0);
  });

  it("active workflow modes are a subset of MODE_CONFIG keys", () => {
    const activeModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
    const configKeys = Object.keys(MODE_CONFIG);
    for (const modeId of activeModes) {
      expect(configKeys).toContain(modeId);
    }
  });

  it("workflow structure supports multiple workflows", () => {
    const workflowKeys = Object.keys(WORKFLOW_MODES);
    expect(workflowKeys).toContain(DEFAULT_WORKFLOW);
    expect(workflowKeys.length).toBeGreaterThanOrEqual(1);
  });

  it("getMessageLabel returns valid label and symbol for each active mode", () => {
    const activeModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
    for (const modeId of activeModes) {
      const label = getMessageLabel(modeId, modeId);
      expect(label.label).toBeTruthy();
      expect(label.symbol).toBeTruthy();
    }
  });

  it("getMessageLabel returns 'You' for user mode", () => {
    const label = getMessageLabel("user", "analyst");
    expect(label.label).toBe("You");
  });
});
