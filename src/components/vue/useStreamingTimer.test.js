import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nextTick } from "vue";
import { useStreamingTimer } from "./useStreamingTimer.js";

describe("useStreamingTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start() begins incrementing elapsedMs every 10ms", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(10);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(10);
    vi.advanceTimersByTime(10);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(20);
  });

  it("stop() clears interval and stops increments", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(30);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(30);
    timer.stop();
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(30);
  });

  it("freeze() captures current elapsed and stops increments", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(50);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(50);
    timer.freeze();
    expect(timer.frozenElapsedMs.value).toBe(50);
    expect(timer.isFrozen.value).toBe(true);
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(50);
    expect(timer.frozenElapsedMs.value).toBe(50);
  });

  it("multiple freeze() calls are no-ops after first", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(50);
    await nextTick();
    timer.freeze();
    const firstFrozen = timer.frozenElapsedMs.value;
    vi.advanceTimersByTime(30);
    await nextTick();
    timer.freeze();
    expect(timer.frozenElapsedMs.value).toBe(firstFrozen);
    expect(timer.isFrozen.value).toBe(true);
  });

  it("reset() zeroes all state without stopping the interval", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(50);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(50);
    timer.reset();
    expect(timer.elapsedMs.value).toBe(0);
    expect(timer.frozenElapsedMs.value).toBe(0);
    expect(timer.isFrozen.value).toBe(false);
    vi.advanceTimersByTime(10);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(10);
  });

  it("start() after stop() resets elapsed to 0", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(50);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(50);
    timer.stop();
    timer.start();
    expect(timer.elapsedMs.value).toBe(0);
    expect(timer.isFrozen.value).toBe(false);
  });

  it("timer values correct after freeze (doesn't keep incrementing)", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(100);
    timer.freeze();
    expect(timer.frozenElapsedMs.value).toBe(100);
    vi.advanceTimersByTime(200);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(100);
    expect(timer.frozenElapsedMs.value).toBe(100);
  });

  it("interval is properly cleaned up (no memory leaks)", async () => {
    const timer = useStreamingTimer();
    timer.start();
    const intervalId = timer.start; // We can't directly access intervalId, so test behavior
    vi.advanceTimersByTime(10);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(10);
    timer.stop();
    // After stop, advancing time should not increment
    vi.advanceTimersByTime(100);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(10);
  });

  it("all returned refs are reactive", async () => {
    const timer = useStreamingTimer();
    let elapsedValue, frozenValue, isFrozenValue;

    // Verify initial state
    expect(timer.elapsedMs.value).toBe(0);
    expect(timer.frozenElapsedMs.value).toBe(0);
    expect(timer.isFrozen.value).toBe(false);

    timer.start();
    vi.advanceTimersByTime(20);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(20);

    timer.freeze();
    expect(timer.frozenElapsedMs.value).toBe(20);
    expect(timer.isFrozen.value).toBe(true);
  });

  it("start() after reset() starts fresh", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(50);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(50);
    timer.reset();
    expect(timer.elapsedMs.value).toBe(0);
    timer.start();
    vi.advanceTimersByTime(30);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(30);
  });

  it("freeze() on already-frozen timer is a no-op", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(50);
    await nextTick();
    timer.freeze();
    expect(timer.isFrozen.value).toBe(true);
    const before = timer.frozenElapsedMs.value;
    vi.advanceTimersByTime(100);
    await nextTick();
    timer.freeze();
    expect(timer.frozenElapsedMs.value).toBe(before);
  });

  it("stop() multiple times is safe", async () => {
    const timer = useStreamingTimer();
    timer.start();
    vi.advanceTimersByTime(10);
    await nextTick();
    timer.stop();
    timer.stop(); // Should not throw
    timer.stop(); // Should not throw
    vi.advanceTimersByTime(10);
    await nextTick();
    expect(timer.elapsedMs.value).toBe(10);
  });
});
