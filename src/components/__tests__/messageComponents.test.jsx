import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the config/ui module - use dynamic import to avoid file system issues
vi.mock("../../config/ui.js", () => ({
  getRoleConfig: (role) => ({
    symbol: role === "analyst" ? "◇" : "■",
    color: "white",
    label: role.charAt(0).toUpperCase() + role.slice(1),
  }),
}));

// Mock chatHelpers
vi.mock("../chatHelpers.js", () => ({
  getMessageLabel: (role, currentRole) => {
    if (role === "user") {
      return { symbol: "\u25c6", color: "white", label: "You" };
    }
    const label = currentRole
      ? currentRole.charAt(0).toUpperCase() + currentRole.slice(1)
      : role;
    return { symbol: "", color: "white", label };
  },
}));

describe("MessageList component", () => {
  it("should render user and assistant messages", async () => {
    const { MessageList } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(MessageList, {
        messages: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: "Hi there!" },
        ],
        currentRole: "analyst",
      }),
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).toContain("Hello");
    expect(allText).toContain("Hi there!");
  });

  it("should filter out system messages", async () => {
    const { MessageList } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(MessageList, {
        messages: [
          { role: "system", text: "You are a helpful assistant." },
          { role: "user", text: "Hello" },
        ],
        currentRole: "analyst",
      }),
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).not.toContain("You are a helpful assistant.");
    expect(allText).toContain("Hello");
  });

  it("should render empty list when no messages", async () => {
    const { MessageList } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(MessageList, {
        messages: [],
        currentRole: "analyst",
      }),
    );

    // Empty array from .map() renders as null in react-test-renderer
    // This is expected behavior - no messages means nothing to render
    const json = renderer.toJSON();
    expect(json).toBeNull();
  });

  it("should render assistant messages with the provided currentRole", async () => {
    const { MessageList } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(MessageList, {
        messages: [{ role: "assistant", text: "Response" }],
        currentRole: "implementer",
      }),
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).toContain("Response");
    expect(allText).toContain("Implementer");
  });

  it("should handle null/undefined text gracefully", async () => {
    const { MessageList } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(MessageList, {
        messages: [
          { role: "user", text: "Hello" },
          { role: "assistant", text: null },
        ],
        currentRole: "analyst",
      }),
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });
  });
});

describe("LoadingIndicator component", () => {
  it("should render Thinking... text", async () => {
    const { LoadingIndicator } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(LoadingIndicator, { currentRole: "analyst" }),
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).toContain("Thinking...");
  });

  it("should display the current role label", async () => {
    const { LoadingIndicator } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(
      React.createElement(LoadingIndicator, { currentRole: "implementer" }),
    );

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).toContain("Implementer");
  });
});

describe("EmptyState component", () => {
  it("should render welcome message", async () => {
    const { EmptyState } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(React.createElement(EmptyState));

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).toContain("Forgekeeper ready.");
  });

  it("should render hint text", async () => {
    const { EmptyState } = await import("../messageComponents.jsx");
    
    const renderer = TestRenderer.create(React.createElement(EmptyState));

    await vi.waitFor(() => {
      const json = renderer.toJSON();
      expect(json).toBeTruthy();
    });

    const json = renderer.toJSON();
    const allText = JSON.stringify(json, null, 2);
    expect(allText).toContain("press Tab");
  });
});
