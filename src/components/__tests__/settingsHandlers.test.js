import { describe, it, expect, vi, beforeEach } from "vitest";

import { handleSettings } from "../settingsHandlers.js";

// Mock settings module
vi.mock("../../settings.js", () => ({
  loadSettings: vi.fn().mockResolvedValue({ role: "analyst" }),
  saveSettings: vi.fn().mockResolvedValue(undefined),
}));

// Mock inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(async (opts) => opts.default || "analyst"),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleSettings", () => {
  it("should call loadSettings first", async () => {
    const { loadSettings } = await import("../../settings.js");

    await handleSettings(
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );

    expect(loadSettings).toHaveBeenCalled();
  });

  it("should call saveSettings with the new role", async () => {
    const { saveSettings } = await import("../../settings.js");

    await handleSettings(
      vi.fn(),
      vi.fn(),
      vi.fn(),
    );

    expect(saveSettings).toHaveBeenCalled();
  });

  it("should call setCurrentRole with the new role", async () => {
    const setCurrentRole = vi.fn();

    await handleSettings(
      vi.fn(),
      setCurrentRole,
      vi.fn(),
    );

    expect(setCurrentRole).toHaveBeenCalledWith("analyst");
  });

  it("should call onRoleToggle with the new role", async () => {
    const onRoleToggle = vi.fn();

    await handleSettings(
      vi.fn(),
      vi.fn(),
      onRoleToggle,
    );

    expect(onRoleToggle).toHaveBeenCalledWith("analyst");
  });

  it("should not call onRoleToggle if it is undefined", async () => {
    await handleSettings(
      vi.fn(),
      vi.fn(),
      undefined,
    );

    // Should not throw
  });

  it("should not call onRoleToggle if it is null", async () => {
    await handleSettings(
      vi.fn(),
      vi.fn(),
      null,
    );

    // Should not throw
  });

  it("should handle custom role from inquirer", async () => {
    const { input } = await import("@inquirer/prompts");
    input.mockResolvedValueOnce("custom-role");

    const setCurrentRole = vi.fn();
    const onRoleToggle = vi.fn();

    await handleSettings(
      vi.fn(),
      setCurrentRole,
      onRoleToggle,
    );

    expect(input).toHaveBeenCalledWith({
      message: "System prompt role",
      default: "analyst",
    });
    expect(setCurrentRole).toHaveBeenCalledWith("custom-role");
    expect(onRoleToggle).toHaveBeenCalledWith("custom-role");
  });
});
