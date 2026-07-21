import { describe, it, expect, vi, beforeEach } from "vitest";

import { chat } from "../llm.js";

vi.mock("node-fetch", () => ({
  default: vi.fn(),
}));

const fetchModule = await import("node-fetch");

describe("chat with workflow mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchModule.default.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => ({ choices: [{ message: { content: "response" } }] }),
    });
  });

  it("should inject analyst workflow prompt when workflowMode is 'analyst'", async () => {
    await chat([{ role: "user", text: "test" }], { workflowMode: "analyst" });

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].content).toContain("Analyst mode");
    expect(body.messages[0].content).toContain("Focus on investigation");
  });

  it("should inject implementer workflow prompt when workflowMode is 'implementer'", async () => {
    await chat([{ role: "user", text: "test" }], { workflowMode: "implementer" });

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);

    expect(body.messages[0].content).toContain("Implementer mode");
    expect(body.messages[0].content).toContain("Focus on building");
  });

  it("should put workflow prompt before config system prompt", async () => {
    await chat([{ role: "user", text: "test" }], { workflowMode: "analyst" });

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);
    const systemContent = body.messages[0].content;

    const analystIndex = systemContent.indexOf("Analyst mode");
    const configPromptIndex = systemContent.indexOf("You are an expert software engineer");

    expect(analystIndex).toBeGreaterThan(-1);
    expect(configPromptIndex).toBeGreaterThan(-1);
    expect(analystIndex).toBeLessThan(configPromptIndex);
  });

  it("should include agents.md after workflow prompt", async () => {
    await chat([{ role: "user", text: "test" }], { workflowMode: "analyst" });

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);
    const systemContent = body.messages[0].content;

    const analystIndex = systemContent.indexOf("Analyst mode");
    const agentsIndex = systemContent.indexOf("--- agents.md ---");

    expect(analystIndex).toBeGreaterThan(-1);
    expect(agentsIndex).toBeGreaterThan(analystIndex);
  });

  it("should not inject workflow prompt when workflowMode is undefined", async () => {
    await chat([{ role: "user", text: "test" }], {});

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);
    const systemContent = body.messages[0].content;

    expect(systemContent).not.toContain("Analyst mode");
    expect(systemContent).not.toContain("Implementer mode");
  });

  it("should not inject workflow prompt when workflowMode is unknown", async () => {
    await chat([{ role: "user", text: "test" }], { workflowMode: "unknown" });

    const call = fetchModule.default.mock.calls[0];
    const body = JSON.parse(call[1].body);
    const systemContent = body.messages[0].content;

    expect(systemContent).not.toContain("Analyst mode");
    expect(systemContent).not.toContain("Implementer mode");
  });
});
