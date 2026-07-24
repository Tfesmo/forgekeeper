import { EventEmitter } from "node:events";

import { describe, it, expect } from "vitest";

describe("gitStatus monitor", () => {
  it("exports start and stop functions", async () => {
    const m = await import("../gitStatus.js");
    expect(typeof m.start).toBe("function");
    expect(typeof m.stop).toBe("function");
  });

  it("emits git_status event with correct shape", async () => {
    const m = await import("../gitStatus.js");
    const emitter = new EventEmitter();

    const results = [];
    const handler = (data) => results.push(data);
    emitter.on("git_status", handler);

    m.start(2000, emitter);

    await new Promise((resolve) => setTimeout(resolve, 300));

    m.stop();

    expect(results.length).toBeGreaterThan(0);
    const data = results[0];
    expect(data).toHaveProperty("path");
    expect(data).toHaveProperty("branch");
    expect(typeof data.branch).toBe("string");
    expect(data).toHaveProperty("isDirty");
    expect(typeof data.isDirty).toBe("boolean");
    expect(data).toHaveProperty("unstagedCount");
    expect(typeof data.unstagedCount).toBe("number");
    expect(data.unstagedCount).toBeGreaterThanOrEqual(0);
    expect(data).toHaveProperty("untrackedCount");
    expect(typeof data.untrackedCount).toBe("number");
    expect(data.untrackedCount).toBeGreaterThanOrEqual(0);
    expect(data).toHaveProperty("timestamp");
    expect(typeof data.timestamp).toBe("number");
  });
});
