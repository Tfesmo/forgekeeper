import { describe, it, expect } from "vitest";

import { passthrough } from "../passthrough.js";

describe("passthrough command", () => {
  it("should return input unchanged", () => {
    expect(passthrough("test")).toBe("test");
  });

  it("should return empty string for empty input", () => {
    expect(passthrough("")).toBe("");
  });

  it("should preserve case", () => {
    expect(passthrough("MiXeD CaSe")).toBe("MiXeD CaSe");
  });

  it("should preserve special characters", () => {
    expect(passthrough("!@#$%^&*")).toBe("!@#$%^&*");
  });
});
