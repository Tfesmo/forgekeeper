import { describe, it, expect } from "vitest";

import { THEME_DEFAULTS } from "../../themes/defaults.js";
import {
  MODE_CONFIG,
  WORKFLOW_MODES,
  DEFAULT_WORKFLOW,
  getMessageLabel,
  formatMs,
  showThinkingIndicator,
} from "./chatHelpers.js";

describe("chatHelpers", () => {
  it("MODE_CONFIG contains all five modes", () => {
    expect(Object.keys(MODE_CONFIG)).toEqual([
      "advisor",
      "architect",
      "implementer",
      "reviewer",
      "analyst",
    ]);
  });

  it.each(Object.keys(MODE_CONFIG))("mode '%s' has symbol, label, and color", (key) => {
    const mode = MODE_CONFIG[key];
    expect(mode.symbol).toBeTruthy();
    expect(mode.label).toBeTruthy();
    expect(mode.color).toBeTruthy();
  });

  it.each(Object.keys(MODE_CONFIG))(
    "mode '%s' color is a CSS variable matching var(--mode-<key>)",
    (key) => {
      const mode = MODE_CONFIG[key];
      expect(mode.color).toBe(`var(--mode-${key})`);
    },
  );

  it("MODE_CONFIG color keys match mode theme defaults", () => {
    const modeKeys = Object.keys(MODE_CONFIG);
    const themeKeys = Object.keys(THEME_DEFAULTS.mode);
    for (const key of modeKeys) {
      expect(themeKeys).toContain(key);
    }
  });

  it("WORKFLOW_MODES includes the default workflow with enabled modes", () => {
    expect(WORKFLOW_MODES).toHaveProperty(DEFAULT_WORKFLOW);
    const activeModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
    expect(Array.isArray(activeModes)).toBe(true);
    expect(activeModes.length).toBeGreaterThan(0);
  });

  it("active workflow modes are a subset of MODE_CONFIG keys", () => {
    const activeModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
    const configKeys = Object.keys(MODE_CONFIG);
    for (const modeId of activeModes) {
      expect(configKeys).toContain(modeId);
    }
  });

  it("workflow structure supports multiple workflows", () => {
    const workflowKeys = Object.keys(WORKFLOW_MODES);
    expect(workflowKeys).toContain(DEFAULT_WORKFLOW);
    expect(workflowKeys.length).toBeGreaterThanOrEqual(1);
  });

  it("getMessageLabel returns valid label and symbol for each active mode", () => {
    const activeModes = WORKFLOW_MODES[DEFAULT_WORKFLOW];
    for (const modeId of activeModes) {
      const label = getMessageLabel(modeId, modeId);
      expect(label.label).toBeTruthy();
      expect(label.symbol).toBeTruthy();
    }
  });

  it("getMessageLabel returns 'You' for user mode", () => {
    const label = getMessageLabel("user", "analyst");
    expect(label.label).toBe("You");
  });
});

describe("formatMs", () => {
  it("returns ms for values under 1000", () => {
    expect(formatMs(0)).toBe("0ms");
    expect(formatMs(500)).toBe("500ms");
    expect(formatMs(999)).toBe("999ms");
  });

  it("returns seconds with one decimal for 1000-9999", () => {
    expect(formatMs(1000)).toBe("1.0s");
    expect(formatMs(3200)).toBe("3.2s");
    expect(formatMs(9999)).toBe("10.0s");
  });

  it("returns minutes with seconds for 60000+", () => {
    expect(formatMs(10000)).toBe("10.0s");
    expect(formatMs(60000)).toBe("1m 0s");
    expect(formatMs(125000)).toBe("2m 5s");
  });
});

describe("showThinkingIndicator", () => {
  it("shows when streaming, assistant has reasoning, and no content yet", () => {
    const msg = { role: "assistant", reasoning_content: "Thinking..." };
    expect(showThinkingIndicator(msg, true)).toBe(true);
  });

  it("hides when not streaming", () => {
    const msg = { role: "assistant", reasoning_content: "Thinking..." };
    expect(showThinkingIndicator(msg, false)).toBe(false);
  });

  it("hides when content is present", () => {
    const msg = { role: "assistant", reasoning_content: "Thinking...", content: "Hello" };
    expect(showThinkingIndicator(msg, true)).toBe(false);
  });

  it("hides for non-assistant messages", () => {
    const msg = { role: "user", content: "Hello" };
    expect(showThinkingIndicator(msg, true)).toBe(false);
  });

  it("shows when content is empty regardless of reasoning_content", () => {
    const msg = { role: "assistant", content: "", reasoning_content: undefined };
    expect(showThinkingIndicator(msg, true)).toBe(true);
  });

  it("shows when content is empty and reasoning_content is null", () => {
    const msg = { role: "assistant", content: "", reasoning_content: null };
    expect(showThinkingIndicator(msg, true)).toBe(true);
  });

  it("hides when content is '0' (string zero - valid content)", () => {
    const msg = { role: "assistant", content: "0" };
    expect(showThinkingIndicator(msg, true)).toBe(false);
  });

  it("does NOT show when content is whitespace ' '", () => {
    const msg = { role: "assistant", content: " " };
    expect(showThinkingIndicator(msg, true)).toBe(false);
  });

  it("shows when content is undefined", () => {
    const msg = { role: "assistant", content: undefined };
    expect(showThinkingIndicator(msg, true)).toBe(true);
  });

  it("shows when content is null", () => {
    const msg = { role: "assistant", content: null };
    expect(showThinkingIndicator(msg, true)).toBe(true);
  });

  it("reasoning_content presence is irrelevant to thinking indicator", () => {
    const msgWithReasoning = { role: "assistant", content: "", reasoning_content: "Thinking..." };
    const msgWithoutReasoning = { role: "assistant", content: "" };
    expect(showThinkingIndicator(msgWithReasoning, true)).toBe(true);
    expect(showThinkingIndicator(msgWithoutReasoning, true)).toBe(true);
  });
});
