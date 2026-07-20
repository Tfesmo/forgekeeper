# Fix Mouse Wheel Scroll Detection

## Problem
Mouse wheel scrolling works once then stops. The `useEffect` that sets up the mouse handler enables xterm mouse mode (`\x1b[?1002h`) and listens for wheel events on `stdin`. However, the sequence detection is broken.

## Root Cause
Line 212: `mouseBuffer[2] === 0x20` — The code checks for space (0x20) but the SGR mouse sequence uses `<` (0x3c) at that position.

The xterm SGR mouse wheel sequence is:
```
ESC [ < M button x y
0x1b 0x5b 0x3c 0x4d ...
```

Position 2 should be `<` (0x3c), not a space (0x20). This means the condition never matches, wheel events are silently dropped into the buffer, and the buffer eventually gets cleared by the `> 20` length check.

## Fix
In `src/components/ChatScreen.jsx`, line 212, change:
```js
mouseBuffer[2] === 0x20
```
to:
```js
mouseBuffer[2] === 0x3c
```

## Files to modify
- `src/components/ChatScreen.jsx` line 212
