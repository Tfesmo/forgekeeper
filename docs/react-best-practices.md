---
title: "React and Ink Best Practices"
tags: [react, ink, best-practices, tui, testing]
topics: [ink-components, hooks, state-management, testing, keyboard-input]
keywords: [react, ink, tui, terminal-ui, testing, useInput, useStdin, box, text]
summary: "Best practices for building terminal UIs with React and Ink. Covers component patterns, hooks, state management, keyboard input handling, and testing strategies."
llm_hints: "Target audience: developers building TUI applications with Ink. Covers component structure, Ink-specific hooks (useInput, useStdin, useMouse), state management patterns, and testing with react-test-renderer and vitest."
---

# React and Ink Best Practices

> **Purpose:** Rules and patterns for building terminal user interfaces using React and the Ink framework. Covers component structure, hooks, state management, and testing strategies.

This section covers best practices for building, structuring, and testing terminal UI applications using React and Ink.

---

## Table of Contents

- [1. Component Structure](#1-component-structure)
- [2. Ink Components](#2-ink-components)
- [3. Ink Hooks](#3-ink-hooks)
- [4. State Management](#4-state-management)
- [5. Keyboard Input Handling](#5-keyboard-input-handling)
- [6. Testing](#6-testing)
- [7. Section Summaries](#7-section-summaries)
- [8. Validation Checklist](#8-validation-checklist)

---

## 1. Component Structure

This section covers top-level component organization, prop passing, and file structure.

### 1.1 Root Component Pattern

- The root component (`App.jsx`) **must** handle setup and coordination only: initialization, loading settings, and managing high-level state.
- Wrap the main UI component in any necessary providers (e.g., `MouseProvider`).
- Defer all rendering logic to child screen components.

```jsx
export default function App() {
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadSettings().then((s) => {
      settingsRef.current = s;
      // Initialize state from settings
    });
  }, []);

  return (
    <MouseProvider>
      <ChatScreen messages={messages} isLoading={isLoading} />
    </MouseProvider>
  );
}
```

### 1.2 Screen Components

- Screen components (e.g., `ChatScreen.jsx`) handle all rendering logic and user interaction.
- Accept all state and callbacks as props from the parent.
- Keep screen components focused on a single view or workflow.
- Use functional components with default exports.

### 1.3 File Organization

- Place components in `src/components/`.
- Group related helpers in sibling files (e.g., `chatHelpers.js`, `keyHandler.js`).
- Keep test files co-located in `__tests__/` subdirectories.

---

## 2. Ink Components

This section covers the core Ink components: `Box`, `Text`, and `ScrollView`.

### 2.1 Box

- Use `<Box>` for layout and grouping. It maps to a flexbox-like container.
- Specify `height` and `width` explicitly where layout behavior depends on it.
- Use `flexGrow`, `flexShrink`, `flexBasis` for responsive layouts.
- Use `flexDirection="column"` for vertical stacking (the default layout direction for most screens).
- Use `overflow="hidden"` on containers that should clip content.

```jsx
<Box flexDirection="column" height={process.stdout.rows || 24}>
  <Box flexGrow={1} flexDirection="column" overflow="hidden">
    <ScrollView ref={scrollRef}>
      {/* scrollable content */}
    </ScrollView>
  </Box>
  <Box flexDirection="column">
    {/* fixed footer area */}
  </Box>
</Box>
```

### 2.2 Text

- Use `<Text>` for all user-facing strings. It supports color, bold, dimColor, and other styling props.
- Use `bold` for emphasis on labels and headers.
- Use `dimColor` for secondary or muted text (e.g., placeholders, token counts).
- Use color presets (`"red"`, `"green"`, `"blue"`, `"yellow"`, `"cyan"`, `"magenta"`, `"white"`) for semantic meaning.

```jsx
<Text bold color={roleConfig.color}>
  {roleConfig.symbol} {roleConfig.label}:
</Text>
<Text dimColor>{formatTokenUsage(tokenUsage.used, tokenUsage.limit)}</Text>
```

### 2.3 ScrollView

- Use `<ScrollView>` from `ink-scroll-view` for any content that may exceed the visible terminal area.
- Assign a `ref` to the `<ScrollView>` for programmatic scroll control (e.g., `scrollToBottom`).
- Call `remeasure()` on terminal resize to ensure correct dimensions.

```jsx
const scrollRef = useRef(null);

<ScrollView ref={scrollRef}>
  {messages.map((msg) => (
    <Box key={msg.id}>
      <Text>{msg.text}</Text>
    </Box>
  ))}
</ScrollView>
```

---

## 3. Ink Hooks

This section covers Ink-specific hooks: `useInput`, `useStdin`, `useMouse`, `useLayoutEffect`.

### 3.1 useInput

- Use `useInput` to handle keyboard events. It is Ink's equivalent of `useEffect` for stdin.
- Always pass an empty dependency array `[]` to avoid stale closures.
- For mutable state accessed inside `useInput`, use refs (e.g., `inputRef`, `isInquirerRef`) instead of state variables to prevent stale closures.
- Return `true` from the handler to prevent Ink from consuming the input.

```jsx
const inputRef = useRef("");
const isInquirerRef = useRef(false);

useInput((inputChar, key) => {
  return handleInput(inputChar, key, {
    inputRef,
    isInquirer: isInquirerRef.current,
    // ... other refs
  });
}, []);
```

### 3.2 useStdin

- Use `useStdin` to access the `stdin` object, which provides `stdout`, `raw` mode, and event listeners.
- Use `stdout.on("resize", handler)` and `stdout.off("resize", handler)` to respond to terminal resizes.
- Use `useStdin` when you need to interact with the terminal's raw mode or register event listeners.

```jsx
const { stdout } = useStdin();

useEffect(() => {
  const handleResize = () => {
    scrollRef.current?.remeasure();
  };

  if (typeof stdout?.on === "function") {
    stdout.on("resize", handleResize);
    return () => {
      stdout.off("resize", handleResize);
    };
  }
}, [stdout]);
```

### 3.3 useMouse

- Use `useMouse` from `@ink-tools/ink-mouse` to handle mouse events.
- Guard mouse events when inquirer prompts are active (inquirer takes over stdin).
- Use `useMouse` with `onMouseWheel` for scroll handling.

```jsx
useMouse({
  onMouseWheel: (wheel) => {
    if (isInquirerRef.current) return;
    if (shiftHeldRef.current) return;
    const delta = wheel === "UP" ? -3 : 3;
    handleScroll(delta, scrollRef, shiftHeldRef);
  },
});
```

### 3.4 useLayoutEffect

- Use `useLayoutEffect` for DOM measurements and scroll adjustments that must happen synchronously before paint.
- Ideal for auto-scrolling to bottom when new messages arrive.
- Always clean up timers or animations set within `useLayoutEffect`.

```jsx
useLayoutEffect(() => {
  if (messages.length > prevMsgCountRef.current) {
    const timer = requestAnimationFrame(() => {
      scrollToBottom(scrollRef);
    });
    return () => cancelAnimationFrame(timer);
  }
}, [messages]);
```

---

## 4. State Management

This section covers state management patterns for Ink components.

### 4.1 State vs Refs

- Use `useState` for values that trigger re-renders (e.g., `input`, `messages`, `isLoading`).
- Use `useRef` for mutable values that do not trigger re-renders:
  - References accessed inside `useInput` handlers (to avoid stale closures).
  - Previous state values used for comparison (e.g., `prevMsgCountRef`).
  - Configuration loaded once and read frequently (e.g., `settingsRef`).

### 4.2 Synchronizing Refs

- Keep a ref in sync with state by assigning it in the render body or via `useEffect`.
- Prefer render-body assignment (`inputRef.current = input`) for immediate sync within the same render cycle.

```jsx
const inputRef = useRef("");
const isInquirerRef = useRef(false);

inputRef.current = input;
isInquirerRef.current = isInquirer;
```

### 4.3 Asynchronous Initialization

- Load settings and configuration in `useEffect` on mount.
- Store async results in refs and update state when ready.
- Guard against race conditions with ref flags (e.g., `agentsWarningShownRef`).

```jsx
useEffect(() => {
  loadSettings().then((s) => {
    settingsRef.current = s;
    // Initialize system prompt and state
  });
}, []);
```

### 4.4 Message History and Navigation

- Maintain a separate history array for Up/Down arrow navigation.
- Use a `historyIndexRef` to track the current position in the history.
- Reset the history index to `-1` when new messages arrive.

---

## 5. Keyboard Input Handling

This section covers patterns for handling keyboard input in Ink applications.

### 5.1 Centralized Input Handler

- Extract keyboard logic into a separate module (e.g., `keyHandler.js`).
- Pass all necessary mutable state as a single refs object to the handler.
- Handle modifier key combinations (e.g., Ctrl+arrows for accelerated scrolling).
- Handle special keys: `up`, `down`, `left`, `right`, `enter`, `backspace`, `escape`, `tab`.

```jsx
// keyHandler.js
export function handleInput(inputChar, key, refs) {
  if (key.up && !refs.isInquirer) {
    // Navigate history
  }
  if (key.enter && !refs.isInquirer) {
    refs.onSubmit(refs.inputRef.current);
    return true;
  }
  return false;
}
```

### 5.2 Integrating Inquirer Prompts

- Set `isInquirer` state to `true` before launching an inquirer prompt.
- Set `isInquirer` back to `false` after the promise resolves.
- Guard `useInput` and `useMouse` handlers to skip processing when `isInquirer` is `true`.

```jsx
async function handleSettings() {
  setIsInquirer(true);
  const role = await inquirer.input({
    message: "System prompt role",
    default: settings.role,
  });
  await saveSettings({ ...settings, role });
  setIsInquirer(false);
}
```

### 5.3 Input Validation

- Check for slash commands (`input.startsWith("/")`) to provide visual feedback (e.g., yellow text).
- Use Tab for command suggestions and role switching.
- Use Escape to clear the input field.

---

## 6. Testing

This section covers testing Ink components using `react-test-renderer` and `vitest`.

### 6.1 Test Setup

- Use `react-test-renderer` to render Ink components to a virtual tree.
- Use `vitest` as the test runner and assertion library.
- Mock external dependencies (API calls, file system, settings) using `vi.fn()` and `vi.mock()`.

```jsx
import { createTestHost } from 'ink/testing';
import { render } from 'react-test-renderer';
import App from '../App';

describe('App', () => {
  it('renders correctly', () => {
    const { root } = render(<App />);
    expect(root.toJSON()).toMatchSnapshot();
  });
});
```

### 6.2 Mocking External Dependencies

- Mock API calls and async functions using `vi.mock()` at the top of the test file.
- Mock file system operations and settings loaders similarly.

```jsx
vi.mock('../../api/llm.js', () => ({
  chat: vi.fn().mockResolvedValue('Response'),
  loadAgentsMd: vi.fn().mockResolvedValue('Agent content'),
  estimateTokenCount: vi.fn().mockReturnValue(10),
}));

vi.mock('../../settings.js', () => ({
  loadSettings: vi.fn().mockResolvedValue({}),
  saveSettings: vi.fn().mockResolvedValue(undefined),
}));
```

### 6.3 Testing User Interactions

- Use `createTestHost` from `ink/testing` to simulate user input in tests.
- Test keyboard input by calling `testHost.stdin.write()` with key sequences.
- Verify state changes by inspecting the rendered tree after interactions.

```jsx
import { createTestHost } from 'ink/testing';

describe('ChatScreen', () => {
  it('submits message on Enter', async () => {
    const { instance, wait } = createTestHost(ChatScreen, {
      messages: [],
      isLoading: false,
      onSubmit: vi.fn(),
    });

    instance.focus();
    instance.key.press('enter');
    await wait();

    expect(instance.props.onSubmit).toHaveBeenCalledWith('');
  });
});
```

### 6.4 Snapshot Testing

- Use snapshot testing for static renders to catch unintended UI changes.
- Combine with functional assertions for critical behavior.
- Update snapshots explicitly when changes are intentional (`vitest -u`).

---

## 7. Section Summaries

Add a 1–2 sentence summary paragraph after every `##` heading to describe the section content.

```markdown
## Authentication

This section covers all authentication methods supported by the system.
```

---

## 8. Validation Checklist

This section provides a checklist for validating React/Ink component implementations before merging.

Every Ink component should pass the following checks before merging:

- [ ] Root component wraps child screen in providers
- [ ] Screen components receive state and callbacks as props
- [ ] `<Box>` has explicit `height`/`width` where layout depends on it
- [ ] `<Text>` uses semantic color presets (`"green"`, `"yellow"`, etc.)
- [ ] `<ScrollView>` has a `ref` for programmatic scroll control
- [ ] `useInput` uses refs for mutable state (not direct state variables)
- [ ] `useInput` passes empty dependency array `[]`
- [ ] Terminal resize handler is registered and cleaned up
- [ ] Mouse events are guarded when inquirer prompts are active
- [ ] `useLayoutEffect` cleans up timers and animations
- [ ] Async initialization uses refs to prevent race conditions
- [ ] Input handler is centralized in a separate module
- [ ] Inquirer prompts toggle `isInquirer` state
- [ ] Tests mock external dependencies with `vi.mock()`
- [ ] Tests use `react-test-renderer` or `ink/testing` for rendering
- [ ] Snapshots are updated intentionally after UI changes

---
