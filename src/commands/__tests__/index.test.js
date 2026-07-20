import { describe, it, expect } from "vitest";

import { COMMANDS, dispatchCommand } from "../index.js";

describe("COMMANDS registry", () => {
  it("should include all known commands", () => {
    expect(COMMANDS).toHaveProperty("help");
    expect(COMMANDS).toHaveProperty("settings");
    expect(COMMANDS).toHaveProperty("echoi");
    expect(COMMANDS).toHaveProperty("passthrough");
  });
});

describe("dispatchCommand", () => {
  it("should return help text for 'help'", () => {
    const result = dispatchCommand("help", "");
    expect(result).toContain("Available commands:");
  });

  it("should return settings message for 'settings'", () => {
    const result = dispatchCommand("settings", "");
    expect(result).toBe("(opens settings editor)");
  });

  it("should delegate echoi to the echoi handler", () => {
    const result = dispatchCommand("echoi", "HELLO");
    expect(result).toBe("hello");
  });

  it("should delegate passthrough to the passthrough handler", () => {
    const result = dispatchCommand("passthrough", "Hello World");
    expect(result).toBe("Hello World");
  });

  it("should return unknown message for unrecognized commands", () => {
    const result = dispatchCommand("nonexistent", "");
    expect(result).toBe("[unknown command: /nonexistent]");
  });

  it("should pass args to handlers that accept them", () => {
    const result = dispatchCommand("echoi", "Test");
    expect(result).toBe("test");
  });
});
