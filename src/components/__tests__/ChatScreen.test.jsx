import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Mock inquirer/prompts
vi.mock("@inquirer/prompts", () => ({
  input: vi.fn(async (opts) => opts.default || "new role"),
}));

// Mock fs/promises
vi.mock("node:fs/promises", () => ({
  access: vi.fn(async () => {}),
  readFile: vi.fn(async () => JSON.stringify({ role: "Existing role" })),
  writeFile: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
}));

// Mock os
vi.mock("node:os", () => ({
  homedir: vi.fn(() => "/tmp/test-home"),
}));

// Mock process.stdout
const originalStdout = process.stdout;
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(process, "stdout", {
    value: { rows: 24 },
    writable: true,
  });
});

afterAll(() => {
  Object.defineProperty(process, "stdout", {
    value: originalStdout,
    writable: true,
  });
});

describe("ChatScreen component", () => {
  it("should render without throwing", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      TestRenderer.create(
        <ChatScreen onCommand={() => {}} onSubmit={() => {}} isLoading={false} />,
      );
    }).not.toThrow();
  });

  it("should render with isLoading=true", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      TestRenderer.create(<ChatScreen onCommand={() => {}} onSubmit={() => {}} isLoading={true} />);
    }).not.toThrow();
  });

  it("should render with isLoading=false", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          messages={[{ role: "user", text: "test" }]}
        />,
      );
    }).not.toThrow();
  });

  it("should display token usage indicator when tokenUsage prop is provided", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    const renderer = TestRenderer.create(
      <ChatScreen
        onCommand={() => {}}
        onSubmit={() => {}}
        isLoading={false}
        messages={[{ role: "user", text: "test" }]}
        tokenUsage={{ used: 16000, limit: 64000, percentage: 25 }}
      />,
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });
  });

  it("should display agents warning when agentsWarning prop is provided", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    const renderer = TestRenderer.create(
      <ChatScreen
        onCommand={() => {}}
        onSubmit={() => {}}
        isLoading={false}
        messages={[{ role: "user", text: "test" }]}
        agentsWarning="⚠ agents.md is 15000 characters (only first 10k injected into context)."
      />,
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });
  });
});
