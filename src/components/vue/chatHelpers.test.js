import { describe, it, expect } from "vitest";
import { ROLE_CONFIG, WORKFLOW_ROLES, DEFAULT_WORKFLOW, getMessageLabel } from "./chatHelpers.js";

describe("chatHelpers", () => {
  it("ROLE_CONFIG contains all five roles", () => {
    expect(Object.keys(ROLE_CONFIG)).toEqual([
      "advisor",
      "architect",
      "implementer",
      "reviewer",
      "analyst",
    ]);
  });

  it.each(Object.keys(ROLE_CONFIG))("role '%s' has symbol, label, and color", (key) => {
    const role = ROLE_CONFIG[key];
    expect(role.symbol).toBeTruthy();
    expect(role.label).toBeTruthy();
    expect(role.color).toBeTruthy();
  });

  it("WORKFLOW_ROLES includes the default workflow with enabled roles", () => {
    expect(WORKFLOW_ROLES).toHaveProperty(DEFAULT_WORKFLOW);
    const activeRoles = WORKFLOW_ROLES[DEFAULT_WORKFLOW];
    expect(Array.isArray(activeRoles)).toBe(true);
    expect(activeRoles.length).toBeGreaterThan(0);
  });

  it("active workflow roles are a subset of ROLE_CONFIG keys", () => {
    const activeRoles = WORKFLOW_ROLES[DEFAULT_WORKFLOW];
    const configKeys = Object.keys(ROLE_CONFIG);
    for (const roleId of activeRoles) {
      expect(configKeys).toContain(roleId);
    }
  });

  it("workflow structure supports multiple workflows", () => {
    const workflowKeys = Object.keys(WORKFLOW_ROLES);
    expect(workflowKeys).toContain(DEFAULT_WORKFLOW);
    expect(workflowKeys.length).toBeGreaterThanOrEqual(1);
  });

  it("getMessageLabel returns valid label and symbol for each active role", () => {
    const activeRoles = WORKFLOW_ROLES[DEFAULT_WORKFLOW];
    for (const roleId of activeRoles) {
      const label = getMessageLabel(roleId, roleId);
      expect(label.label).toBeTruthy();
      expect(label.symbol).toBeTruthy();
    }
  });

  it("getMessageLabel returns 'You' for user role", () => {
    const label = getMessageLabel("user", "analyst");
    expect(label.label).toBe("You");
  });
});
