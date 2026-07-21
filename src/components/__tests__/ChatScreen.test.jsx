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

// Mock workflows
vi.mock("../../workflows.js", () => ({
  cycleWorkflow: vi.fn((current) => {
    if (current === "analyst") return "implementer";
    return "analyst";
  }),
  WORKFLOW_LABELS: {
    analyst: "Analyst",
    implementer: "Implementer",
  },
  WORKFLOW_NAME: "Coding",
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

  it("should not render system messages", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    const renderer = TestRenderer.create(
      <ChatScreen
        onCommand={() => {}}
        onSubmit={() => {}}
        isLoading={false}
        messages={[
          { role: "system", text: "You are a helpful assistant." },
          { role: "user", text: "hello" },
          { role: "assistant", text: "hi there!" },
        ]}
      />,
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();

      // System message should not appear in the rendered output
      const allText = JSON.stringify(json, null, 2);
      expect(allText).not.toContain("You are a helpful assistant.");
      expect(allText).toContain("hello");
      expect(allText).toContain("hi there!");
    });
  });

  it("should render workflow indicator with default analyst mode", async () => {
    let renderer;
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      renderer = TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          messages={[{ role: "user", text: "test" }]}
        />,
      );
    }).not.toThrow();

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).toContain("Analyst");
    });
  });

  it("should display workflow label in input area", async () => {
    let renderer;
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      renderer = TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          messages={[{ role: "user", text: "test" }]}
          agentRole="analyst"
        />,
      );
    }).not.toThrow();

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).toContain("Analyst");
    });
  });

  it("should display implementer label when agentRole is implementer", async () => {
    let renderer;
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      renderer = TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          messages={[{ role: "user", text: "test" }]}
          agentRole="implementer"
        />,
      );
    }).not.toThrow();

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).toContain("Implementer");
    });
  });

  it("should show 'press Tab to switch role' hint when input is empty", async () => {
    let renderer;
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      renderer = TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          messages={[{ role: "user", text: "test" }]}
        />,
      );
    }).not.toThrow();

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).toContain("press Tab to switch role");
    });
  });

  it("should call onRoleToggle when invoked directly", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    const onRoleToggle = vi.fn();

    let renderer;
    expect(() => {
      renderer = TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          messages={[{ role: "user", text: "test" }]}
          agentRole="analyst"
          onRoleToggle={onRoleToggle}
        />,
      );
    }).not.toThrow();

    await vi.waitFor(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));

      const childWithHandler = renderer.root.find(
        (node) =>
          typeof node !== "string" && node.props && typeof node.props.onRoleToggle === "function",
      );

      childWithHandler.props.onRoleToggle("implementer");

      expect(onRoleToggle).toHaveBeenCalledWith("implementer");
    });
  });

  it("should render system message filtering correctly with agent role", async () => {
    let renderer;
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    expect(() => {
      renderer = TestRenderer.create(
        <ChatScreen
          onCommand={() => {}}
          onSubmit={() => {}}
          isLoading={false}
          agentRole="implementer"
          messages={[
            { role: "system", text: "You are in Implementer mode..." },
            { role: "user", text: "Build this feature" },
            { role: "assistant", text: "I'll build it now" },
          ]}
        />,
      );
    }).not.toThrow();

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).not.toContain("You are in Implementer mode");
      expect(json).toContain("Build this feature");
      expect(json).toContain("I'll build it now");
    });
  });

  it("should display workflow name above input prompt", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    const renderer = TestRenderer.create(
      <ChatScreen
        onCommand={() => {}}
        onSubmit={() => {}}
        isLoading={false}
        messages={[{ role: "assistant", text: "response" }]}
        agentRole="analyst"
      />,
    );

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).toContain("Coding");
      expect(json).toContain("◇");
      expect(json).toContain("Analyst");
    });
  });

  it("should resolve assistant role to agent role label", async () => {
    const { default: ChatScreen } = await import("../ChatScreen.jsx");

    const renderer = TestRenderer.create(
      <ChatScreen
        onCommand={() => {}}
        onSubmit={() => {}}
        isLoading={false}
        messages={[{ role: "assistant", text: "response" }]}
        agentRole="implementer"
      />,
    );

    await vi.waitFor(() => {
      const json = JSON.stringify(renderer.toJSON(), null, 2);
      expect(json).toContain("■");
      expect(json).toContain("Implementer");
      expect(json).not.toContain("assistant");
    });
  });
});
