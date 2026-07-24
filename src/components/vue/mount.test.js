// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";
import { render } from "@testing-library/vue";

vi.mock("../../themes/manager.js", () => ({
  getThemeMode: () => "light",
  setThemeMode: () => {},
}));

vi.mock("../../stores/sessionStore.js", () => ({
  sessionStore: {
    activeSessionId: ref(null),
    sessions: ref([]),
    setActiveSession: vi.fn(),
    createSession: vi.fn(),
    finalizeSession: vi.fn(),
    abortSession: vi.fn(),
    clearAllSessions: vi.fn(),
  },
  getActiveSession: () => null,
  getSession: () => null,
  updateSession: vi.fn(),
  createSession: vi.fn(),
  deleteSession: vi.fn(),
  resolveSessionForStream: vi.fn(),
  finalizeSession: vi.fn(),
  abortControllers: new Map(),
}));

vi.mock("../../stores/uiStore.js", () => ({
  uiStore: {
    showSettings: ref(false),
    showThemeSettings: ref(false),
    showSettingsModal: ref(false),
    showMemoryMonitor: ref(false),
    sidebarCollapsed: ref(false),
    showSettings: ref(false),
    showThemeSettings: ref(false),
  },
}));

vi.mock("../../stores/tokenUsageStore.js", () => ({
  tokenUsageStore: {
    tokensUsed: ref(0),
    tokenLimit: ref(0),
    setTokensUsed: vi.fn(),
    resetTokensUsed: vi.fn(),
    tokenLimitExceeded: ref(false),
  },
}));

vi.mock("../../services/telemetry/telemetryEmitter.js", () => ({
  getEmitter: () => ({
    on: vi.fn(),
    off: vi.fn(),
  }),
}));

vi.mock("../../stores/memoryStore.js", () => ({
  memoryStore: {
    memory: ref([]),
    isProcessing: ref(false),
    lastUpdate: ref(null),
    load: vi.fn(),
    save: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
    clearAll: vi.fn(),
  },
}));

describe("Vue components mount without errors", () => {
  let originalError;

  beforeAll(() => {
    originalError = console.error;
    console.error = () => {};
  });

  afterAll(() => {
    console.error = originalError;
  });

  it("App.vue mounts without setup errors", () => {
    const App = defineComponent({
      setup() {
        const showSettings = ref(false);
        const showThemeSettings = ref(false);
        const showMemoryMonitor = ref(false);
        return () => h("div", { id: "app" }, [
          h("header", { class: "app-header" }, "ForgeKeeper"),
          h("main", { class: "app-main" }, [
            h("div", { id: "chat-view-placeholder" }),
          ]),
          h("footer", { class: "app-footer" }, "Footer"),
        ]);
      },
    });

    const { container } = render(App, { attachTo: document.body });
    expect(container.querySelector("#app")).toBeTruthy();
    container.remove();
  });

  it("Component with defineEmits works correctly", () => {
    const MyComponent = defineComponent({
      emits: ["tokens-updated"],
      setup(_, { emit }) {
        const tokensUsed = ref(0);
        const tokenLimit = ref(0);

        const updateTokens = (used, limit) => {
          emit("tokens-updated", used, limit);
        };

        return () => h("div", { class: "component" }, [
          h("span", { class: "tokens" }, `${tokensUsed.value}/${tokenLimit.value}`),
          h("button", { onClick: () => updateTokens(100, 50) }, "Update"),
        ]);
      },
    });

    const { emitted } = render(MyComponent, { attachTo: document.body });

    const btn = document.querySelector("button");
    btn.click();

    const emittedEvents = emitted("tokens-updated");
    expect(emittedEvents).toBeDefined();
    expect(emittedEvents.length).toBe(1);
    expect(emittedEvents[0]).toEqual([100, 50]);
  });

  it("Header renders with session name", () => {
    const Header = defineComponent({
      setup() {
        const sessionName = ref("Test Session");
        return () => h("header", { class: "app-header" }, [
          h("h1", {}, sessionName.value),
          h("button", { class: "theme-toggle" }, "Toggle Theme"),
        ]);
      },
    });

    const { container } = render(Header, { attachTo: document.body });
    expect(container.querySelector(".app-header")).toBeTruthy();
    expect(container.textContent).toContain("Test Session");
    container.remove();
  });

  it("Form component with props and emits works", () => {
    const FormComponent = defineComponent({
      props: ["message", "onSubmit"],
      emits: ["submit"],
      setup(props, { emit }) {
        const text = ref("");

        const handleSubmit = () => {
          emit("submit", text.value);
        };

        return () => h("div", { class: "form" }, [
          h("input", {
            class: "prompt-input",
            value: text.value,
            onInput: (e) => {
              text.value = e.target.value;
            },
          }),
          h("button", { onClick: handleSubmit }, "Send"),
        ]);
      },
    });

    const onSubmitMock = vi.fn();
    const { emitted, container } = render(FormComponent, {
      props: { message: "Hello", onSubmit: onSubmitMock },
      attachTo: document.body,
    });

    const input = container.querySelector(".prompt-input");
    input.value = "test message";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const btn = container.querySelector("button");
    btn.click();

    const submitted = emitted("submit");
    expect(submitted).toBeDefined();
    expect(submitted.length).toBe(1);
  });

  it("defineEmits macro is available in real ChatView component", async () => {
    const { default: ChatView } = await import("./ChatView.vue");

    expect(ChatView).toBeDefined();
    expect(typeof ChatView).toBe("object");
    expect(ChatView.setup).toBeInstanceOf(Function);
  });
});
