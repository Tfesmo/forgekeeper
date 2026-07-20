import { describe, it, expect } from "vitest";

import { echoi } from "../echoi.js";

describe("echoi command", () => {
  it("should convert input to lowercase", () => {
    expect(echoi("HELLO")).toBe("hello");
  });

  it("should return empty string for empty input", () => {
    expect(echoi("")).toBe("");
  });

  it("should handle mixed case", () => {
    expect(echoi("Hello World")).toBe("hello world");
  });

  it("should handle already lowercase input", () => {
    expect(echoi("already lowercase")).toBe("already lowercase");
  });

  it("should handle special characters", () => {
    expect(echoi("HELLO WORLD!")).toBe("hello world!");
  });
});
