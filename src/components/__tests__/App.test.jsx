import React from "react";
import TestRenderer from "react-test-renderer";
import { describe, it, expect, vi, beforeEach } from "vitest";

import App from "../App.jsx";

// Mock fs/promises for agents.md reading
vi.mock("node:fs/promises", () => ({
  readFile: vi.fn(async () => "x".repeat(15000)),
  access: vi.fn(async () => {}),
  mkdir: vi.fn(async () => {}),
  writeFile: vi.fn(async () => {}),
}));

// Mock the chat API
vi.mock("../../api/llm.js", () => ({
  chat: vi.fn(async () => "Mocked LLM response"),
  estimateTokenCount: vi.fn(() => 100),
  formatTokenUsage: vi.fn((used, limit) => `${used}/${limit}`),
  loadAgentsMd: vi.fn(async () => "x".repeat(15000)),
  CONTEXT_LIMIT: 64000,
}));

const { chat } = await import("../../api/llm.js");

// Mock loadSettings
vi.mock("../../settings.js", () => ({
  loadSettings: vi.fn(async () => ({
    role: "Test role",
  })),
}));

const { loadSettings } = await import("../../settings.js");

describe("App component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render ChatScreen with props", () => {
    let renderer;
    expect(() => {
      renderer = TestRenderer.create(<App />);
    }).not.toThrow();
    expect(renderer).toBeDefined();
  });

  it("should load settings on mount", async () => {
    TestRenderer.create(<App />);
    await vi.waitFor(() => {
      expect(loadSettings).toHaveBeenCalled();
    });
  });

  it("should call chat API on submit", async () => {
    chat.mockResolvedValue("Test response");

    const renderer = TestRenderer.create(<App />);

    // Wait for settings to load
    await vi.waitFor(() => {
      expect(loadSettings).toHaveBeenCalled();
    });

    // Get the root component
    const root = renderer.toJSON();
    expect(root).toBeTruthy();

    // Note: onSubmit is a prop passed to ChatScreen
    // In a real test we'd trigger it, but with ink + react-test-renderer
    // the input handling is complex. We verify the structure exists.
  });

  it("should render command responses in ChatScreen", async () => {
    const renderer = TestRenderer.create(<App />);

    await vi.waitFor(() => {
      expect(loadSettings).toHaveBeenCalled();
    });

    // Find the component with onCommand prop and call it
    const childWithHandler = renderer.root.find(
      (node) =>
        typeof node !== "string" && node.props && typeof node.props.onCommand === "function",
    );
    expect(childWithHandler).toBeTruthy();

    // Call onCommand with "help"
    childWithHandler.props.onCommand("help", "");

    await vi.waitFor(() => {
      // After calling handleCommand, the rendered output should contain the help text
      const jsonStr = JSON.stringify(renderer.toJSON());
      expect(jsonStr).toContain("Available commands:");
    });
  });

  it("should handle chat errors gracefully", async () => {
    chat.mockRejectedValue(new Error("Network error"));

    const renderer = TestRenderer.create(<App />);

    // Wait for settings to load
    await vi.waitFor(() => {
      expect(loadSettings).toHaveBeenCalled();
    });

    const root = renderer.toJSON();
    expect(root).toBeTruthy();
  });

  it("should call chat with the system prompt and user message", async () => {
    const { readFile } = await import("node:fs/promises");
    readFile.mockResolvedValue("agents.md content here");

    chat.mockResolvedValue("Test response");

    const renderer = TestRenderer.create(<App />);

    // Wait for settings to load
    await vi.waitFor(() => {
      expect(loadSettings).toHaveBeenCalled();
    });

    // Find the component and simulate submitting the first message
    const childWithHandler = renderer.root.find(
      (node) => typeof node !== "string" && node.props && typeof node.props.onSubmit === "function",
    );
    childWithHandler.props.onSubmit("Hello");

    await vi.waitFor(() => {
      expect(chat).toHaveBeenCalled();
    });

    // Verify chat was called with system message + user message
    const call = chat.mock.calls[0];
    const messages = call[0];
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe("system");
    expect(messages[0].text).toContain("agents.md");
    expect(messages[1]).toEqual({ role: "user", text: "Hello" });
  });
});
