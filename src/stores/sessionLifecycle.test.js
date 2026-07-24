import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../services/llmService.js", () => ({
  buildSystemMessage: vi.fn().mockReturnValue("TEST_SYSTEM_MESSAGE"),
}));

describe("resolveSessionForStream", () => {
  const sessionDir = path.join(os.tmpdir(), `forgekeeper-lifecycle-test-${Date.now()}`);

  beforeEach(() => {
    process.env.SESSION_DIR = sessionDir;
  });

  afterEach(() => {
    delete process.env.SESSION_DIR;
    try {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    } catch {
      // ignore
    }
  });

  it("should include the system message when creating a new session", async () => {
    const { resolveSessionForStream, deleteSession } = await import("./sessionLifecycle.js");

    const sessionId = "test-session-" + Date.now();

    const result = await resolveSessionForStream(sessionId, "analyst", "Hello world");

    expect(result.error).toBeNull();
    expect(result.session).toBeDefined();
    expect(result.session.messages).toHaveLength(2);
    expect(result.session.messages[0].role).toBe("system");
    expect(result.session.messages[0].content).toBe("TEST_SYSTEM_MESSAGE");
    expect(result.session.messages[1].role).toBe("user");
    expect(result.session.messages[1].content).toBe("Hello world");

    deleteSession(sessionId);
  });

  it("should include the system message when session already exists on disk", async () => {
    const { resolveSessionForStream, createSession, deleteSession } =
      await import("./sessionLifecycle.js");

    const sessionId = "test-session-2-" + Date.now();

    // Create a session on disk with the system message
    const { session: initialSession } = createSession("analyst", { id: sessionId });
    expect(initialSession.messages[0].role).toBe("system");

    // Now resolve it again — this simulates the SSE GET hitting an existing session
    const result = await resolveSessionForStream(sessionId, "analyst", "Second message");

    expect(result.error).toBeNull();
    expect(result.session.messages).toHaveLength(2);
    expect(result.session.messages[0].role).toBe("system");
    expect(result.session.messages[0].content).toBe("TEST_SYSTEM_MESSAGE");

    deleteSession(sessionId);
  });
});
