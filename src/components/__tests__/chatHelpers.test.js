import { describe, it, expect, vi } from "vitest";

import {
  INPUT_AREA_HEIGHT,
  INPUT_PADDING_COLUMNS,
  buildInputRefs,
  handleScroll,
  scrollToBottom,
  resolveDisplayRole,
  getMessageLabel,
} from "../chatHelpers.js";

describe("chatHelpers constants", () => {
  it("should export INPUT_AREA_HEIGHT as 3", () => {
    expect(INPUT_AREA_HEIGHT).toBe(3);
  });

  it("should export INPUT_PADDING_COLUMNS as 36", () => {
    expect(INPUT_PADDING_COLUMNS).toBe(36);
  });
});

describe("buildInputRefs", () => {
  it("should return an object with all expected properties", () => {
    const refs = {
      isInquirerRef: { current: false },
      scrollRef: { current: {} },
      shiftHeldRef: { current: false },
      scrollTimerRef: { current: null },
      scrollSpeedRef: { current: 1 },
      inputRef: { current: "test input" },
      historyIndexRef: { current: -1 },
      userMessagesHistoryRef: { current: [] },
      stdout: { on: vi.fn(), off: vi.fn() },
      handleSettings: vi.fn(),
      currentRole: "analyst",
      setCurrentRole: vi.fn(),
    };

    const props = {
      onCommand: vi.fn(),
      onSubmit: vi.fn(),
      onRoleToggle: vi.fn(),
      setInput: vi.fn(),
    };

    const result = buildInputRefs(refs, props);

    expect(result.isInquirer).toBe(false);
    expect(result.scrollRef).toBe(refs.scrollRef);
    expect(result.shiftHeldRef).toBe(refs.shiftHeldRef);
    expect(result.scrollTimerRef).toBe(refs.scrollTimerRef);
    expect(result.scrollSpeedRef).toBe(refs.scrollSpeedRef);
    expect(result.inputRef).toBe(refs.inputRef);
    expect(result.historyIndexRef).toBe(refs.historyIndexRef);
    expect(result.userMessagesHistoryRef).toBe(refs.userMessagesHistoryRef);
    expect(result.stdout).toBe(refs.stdout);
    expect(result.onCommand).toBe(props.onCommand);
    expect(result.onSubmit).toBe(props.onSubmit);
    expect(result.handleSettings).toBe(refs.handleSettings);
    expect(result.currentRole).toBe(refs.currentRole);
    expect(result.setCurrentRole).toBe(refs.setCurrentRole);
    expect(result.onRoleToggle).toBe(props.onRoleToggle);
    expect(result.setInput).toBe(props.setInput);
  });

  it("should return isInquirer from the ref current value", () => {
    const refs = {
      isInquirerRef: { current: true },
      scrollRef: { current: {} },
      shiftHeldRef: { current: false },
      scrollTimerRef: { current: null },
      scrollSpeedRef: { current: 1 },
      inputRef: { current: "" },
      historyIndexRef: { current: -1 },
      userMessagesHistoryRef: { current: [] },
      stdout: {},
      handleSettings: vi.fn(),
      currentRole: "analyst",
      setCurrentRole: vi.fn(),
    };

    const props = {
      onCommand: vi.fn(),
      onSubmit: vi.fn(),
      onRoleToggle: vi.fn(),
      setInput: vi.fn(),
    };

    const result = buildInputRefs(refs, props);
    expect(result.isInquirer).toBe(true);
  });

  it("getCommandNames should return command keys excluding help and settings", () => {
    const refs = {
      isInquirerRef: { current: false },
      scrollRef: { current: {} },
      shiftHeldRef: { current: false },
      scrollTimerRef: { current: null },
      scrollSpeedRef: { current: 1 },
      inputRef: { current: "" },
      historyIndexRef: { current: -1 },
      userMessagesHistoryRef: { current: [] },
      stdout: {},
      handleSettings: vi.fn(),
      currentRole: "analyst",
      setCurrentRole: vi.fn(),
    };

    const props = {
      onCommand: vi.fn(),
      onSubmit: vi.fn(),
      onRoleToggle: vi.fn(),
      setInput: vi.fn(),
    };

    const result = buildInputRefs(refs, props);
    const commands = result.getCommandNames();

    expect(commands).not.toContain("help");
    expect(commands).not.toContain("settings");
  });
});

describe("handleScroll", () => {
  it("should not scroll when shiftHeldRef is true", () => {
    const scrollRef = { current: { scrollBy: vi.fn() } };
    const shiftHeldRef = { current: true };

    handleScroll(5, scrollRef, shiftHeldRef);

    expect(scrollRef.current.scrollBy).not.toHaveBeenCalled();
  });

  it("should not scroll when scrollRef is null", () => {
    const scrollRef = { current: null };
    const shiftHeldRef = { current: false };

    handleScroll(5, scrollRef, shiftHeldRef);

    // Should not throw
  });

  it("should call scrollBy with the delta", () => {
    const scrollBy = vi.fn();
    const scrollRef = { current: { scrollBy } };
    const shiftHeldRef = { current: false };

    handleScroll(10, scrollRef, shiftHeldRef);

    expect(scrollBy).toHaveBeenCalledWith(10);
  });

  it("should scroll by negative delta for upward scroll", () => {
    const scrollBy = vi.fn();
    const scrollRef = { current: { scrollBy } };
    const shiftHeldRef = { current: false };

    handleScroll(-3, scrollRef, shiftHeldRef);

    expect(scrollBy).toHaveBeenCalledWith(-3);
  });
});

describe("scrollToBottom", () => {
  it("should call scrollToBottom on the scroll ref", () => {
    const scrollToBottomFn = vi.fn();
    const scrollRef = { current: { scrollToBottom: scrollToBottomFn } };

    scrollToBottom(scrollRef);

    expect(scrollToBottomFn).toHaveBeenCalled();
  });

  it("should not throw when scrollRef is null", () => {
    const scrollRef = { current: null };

    expect(() => scrollToBottom(scrollRef)).not.toThrow();
  });
});

describe("resolveDisplayRole", () => {
  it("should return 'user' for user role", () => {
    expect(resolveDisplayRole("user", "analyst")).toBe("user");
  });

  it("should return currentRole for assistant role", () => {
    expect(resolveDisplayRole("assistant", "analyst")).toBe("analyst");
    expect(resolveDisplayRole("assistant", "implementer")).toBe("implementer");
  });

  it("should return the role as-is for other roles", () => {
    expect(resolveDisplayRole("system", "analyst")).toBe("system");
    expect(resolveDisplayRole("tool", "analyst")).toBe("tool");
  });
});

describe("getMessageLabel", () => {
  it("should return user label configuration", () => {
    const label = getMessageLabel("user", "analyst");
    expect(label.label).toBe("You");
    expect(label.color).toBe("white");
  });

  it("should return assistant role config based on currentRole", () => {
    const analystLabel = getMessageLabel("assistant", "analyst");
    const implementerLabel = getMessageLabel("assistant", "implementer");

    expect(analystLabel.label).toBe("Analyst");
    expect(implementerLabel.label).toBe("Implementer");
  });

  it("should return config for system role", () => {
    const label = getMessageLabel("system", "analyst");
    expect(label).toBeTruthy();
    expect(label.label).toBe("system");
  });
});
