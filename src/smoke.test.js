import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect, vi } from "vitest";

vi.mock("tail-file", () => ({
  default: class MockTail {
    on() {
      return this;
    }
    start() {
      return this;
    }
  },
}));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("module loading smoke test", () => {
  it("parser pipeline config loads", async () => {
    const { loadConfig } = await import("./services/parserPipeline/config.js");
    const config = loadConfig();
    if (!config.parsers?.ikllama) {
      throw new Error("Missing ikllama parsers in config");
    }
  });

  it("parser pipeline creates without error", async () => {
    const { loadConfig } = await import("./services/parserPipeline/config.js");
    const { createPipeline } = await import("./services/parserPipeline/pipeline.js");
    const config = loadConfig();
    const pipeline = createPipeline(config);
    if (!pipeline.emitter) {
      throw new Error("Pipeline missing emitter");
    }
  });

  it("log monitor module loads", async () => {
    const { tailLogFile } = await import("./services/logMonitor.js");
    if (typeof tailLogFile !== "function") {
      throw new Error("tailLogFile is not a function");
    }
  });

  it("telemetry shared module loads", async () => {
    const { setEmitter, getEmitter } = await import("./services/telemetry/telemetryEmitter.js");
    if (typeof setEmitter !== "function" || typeof getEmitter !== "function") {
      throw new Error("telemetry shared exports are not functions");
    }
  });

  it("telemetry emitter loads", async () => {
    const { loadConfig } = await import("./services/parserPipeline/config.js");
    const { createPipeline } = await import("./services/parserPipeline/pipeline.js");
    const config = loadConfig();
    const pipeline = createPipeline(config);
    if (typeof pipeline.emitter.emit !== "function") {
      throw new Error("emitter missing emit");
    }
  });

  it("session routes module loads", async () => {
    const { sessionRoutes } = await import("./routes/sessionRoutes.js");
    if (!sessionRoutes) {
      throw new Error("sessionRoutes is falsy");
    }
  });

  it("sse routes module loads", async () => {
    const { setupSseRoutes } = await import("./routes/sseRoutes.js");
    if (typeof setupSseRoutes !== "function") {
      throw new Error("setupSseRoutes is not a function");
    }
  });

  it("session lifecycle module loads", async () => {
    const mod = await import("./stores/sessionLifecycle.js");
    const expected = [
      "createSession",
      "getSession",
      "deleteSession",
      "updateSession",
      "finalizeSession",
      "resolveSessionForStream",
      "finalizeSessionOnSuccess",
      "finalizeSessionOnError",
      "getActiveSessionId",
      "listSessions",
      "getSessionStatus",
    ];
    for (const name of expected) {
      if (typeof mod[name] !== "function") {
        throw new Error(`sessionLifecycle missing export: ${name}`);
      }
    }
  });

  it("all monitors export start() and stop()", async () => {
    const monitorsDir = path.join(__dirname, "monitors");
    const files = fs.readdirSync(monitorsDir).filter((f) => f.endsWith(".js"));

    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const mod = await import(path.join(monitorsDir, file));
      expect(typeof mod.start, `monitor ${file}: start`).toBe("function");
      expect(typeof mod.stop, `monitor ${file}: stop`).toBe("function");
    }
  });
});
