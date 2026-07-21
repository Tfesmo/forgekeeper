/**
 * Handles keyboard input events for the chat screen.
 *
 * This module contains the logic for processing keyboard events including:
 * - Navigation (arrows, page up/down, home/end)
 * - History traversal (up/down when input has content)
 * - Accelerated scrolling (Ctrl+arrows)
 * - Text input and editing (backspace, character entry)
 * - Special keys (escape, tab, shift)
 *
 * The component must pass refs for state it needs mutated, and a setInput
 * callback for any state updates.
 */

/**
 * Handles a keyboard event. Mutates refs and calls setInput as needed.
 * Returns true if the event was consumed, false to pass through.
 */
export function handleInput(inputChar, key, refs) {
  const {
    isInquirer,
    scrollRef,
    shiftHeldRef,
    scrollTimerRef,
    scrollSpeedRef,
    inputRef,
    historyIndexRef,
    userMessagesHistoryRef,
    stdout,
    onCommand,
    onSubmit,
    handleSettings,
    currentRole,
    setCurrentRole,
    onRoleToggle,
    setInput,
    getCommandNames,
  } = refs;

  if (isInquirer) return false;

  // Shift-toggle: disable mouse tracking when held for text selection
  if (key.shift && key.up) {
    stdout?.write("\x1b[?1002l");
    shiftHeldRef.current = false;
    return false;
  }
  if (key.shift && key.down) {
    stdout?.write("\x1b[?1002h");
    shiftHeldRef.current = true;
    return true;
  }
  if (key.escape) {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollSpeedRef.current = 1;
    setInput("");
    return true;
  }

  if (key.tab) {
    const nextRole = cycleWorkflow(currentRole);
    setCurrentRole(nextRole);
    if (onRoleToggle) {
      onRoleToggle(nextRole);
    }
    return true;
  }

  if (key.return && inputRef.current.trim()) {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollSpeedRef.current = 1;
    const trimmed = inputRef.current.trim();

    if (trimmed.startsWith("/")) {
      processCommand(trimmed, { onCommand, scrollSpeedRef, handleSettings, getCommandNames });
    } else {
      onSubmit(trimmed);
    }

    setInput("");
    return true;
  }

  if (key.backspace) {
    historyIndexRef.current = -1;
    setInput((prev) => prev.slice(0, -1));
    return true;
  }

  // Accelerated scroll for Ctrl+up/down
  if (key.ctrl && key.upArrow) {
    handleScroll(-scrollSpeedRef.current, scrollRef, shiftHeldRef);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollSpeedRef.current = Math.min(scrollSpeedRef.current + 1, 3);
    }, 300);
    return true;
  }

  if (key.ctrl && key.downArrow) {
    handleScroll(scrollSpeedRef.current, scrollRef, shiftHeldRef);
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollSpeedRef.current = Math.min(scrollSpeedRef.current + 1, 3);
    }, 300);
    return true;
  }

  // Arrow key handling: history navigation when input has content, scroll otherwise
  if (key.upArrow) {
    if (inputRef.current.trim()) {
      const history = userMessagesHistoryRef.current;
      if (history.length === 0) {
        handleScroll(-1, scrollRef, shiftHeldRef);
        return true;
      }
      if (historyIndexRef.current === -1) {
        historyIndexRef.current = history.length - 1;
      } else if (historyIndexRef.current > 0) {
        historyIndexRef.current--;
      }
      setInput(history[historyIndexRef.current]);
    } else {
      handleScroll(-1, scrollRef, shiftHeldRef);
      return true;
    }
    return true;
  }

  if (key.downArrow) {
    if (inputRef.current.trim()) {
      const history = userMessagesHistoryRef.current;
      if (history.length === 0) {
        handleScroll(1, scrollRef, shiftHeldRef);
        return true;
      }
      if (historyIndexRef.current < history.length - 1) {
        historyIndexRef.current++;
        setInput(history[historyIndexRef.current]);
      } else {
        historyIndexRef.current = -1;
        setInput("");
      }
    } else {
      handleScroll(1, scrollRef, shiftHeldRef);
      return true;
    }
    return true;
  }

  if (key.pageUp) {
    handleScroll(-(stdout?.rows || 24), scrollRef, shiftHeldRef);
    return true;
  }

  if (key.pageDown) {
    handleScroll(stdout?.rows || 24, scrollRef, shiftHeldRef);
    return true;
  }

  if (key.home) {
    if (scrollRef.current) {
      scrollRef.current.scrollToTop();
    }
    return true;
  }

  if (key.end) {
    if (scrollRef.current) {
      scrollRef.current.scrollToBottom();
    }
    return true;
  }

  if (!key.ctrl && !key.meta && inputChar.length === 1) {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollSpeedRef.current = 1;
    historyIndexRef.current = -1;
    setInput((prev) => prev + inputChar);
    return true;
  }

  return false;
}

/**
 * Scrolls the ScrollView by a delta amount.
 */
function handleScroll(delta, scrollRef, shiftHeldRef) {
  if (shiftHeldRef.current) return;
  if (!scrollRef.current) return;
  scrollRef.current.scrollBy(delta);
}

/**
 * Cycles through available workflow roles.
 */
function cycleWorkflow(currentRole) {
  const order = ["analyst", "implementer"];
  const index = order.indexOf(currentRole);
  const nextIndex = (index + 1) % order.length;
  return order[nextIndex];
}

/**
 * Processes a slash command and dispatches to the appropriate handler.
 */
function processCommand(trimmed, refs) {
  const { onCommand, handleSettings, getCommandNames } = refs;
  const cmd = trimmed.slice(1).trim();

  if (cmd.startsWith("settings")) {
    handleSettings();
  } else if (cmd.startsWith("help")) {
    onCommand("help", "");
  } else {
    const knownNames = getCommandNames();
    const matched = knownNames.find((name) => cmd.startsWith(name));

    if (matched) {
      onCommand(matched, cmd.slice(matched.length).trim());
    } else {
      onCommand("_unknown", cmd);
    }
  }
}
