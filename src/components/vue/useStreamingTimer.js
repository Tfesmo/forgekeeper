import { ref } from "vue";

export function useStreamingTimer() {
  const elapsedMs = ref(0);
  const frozenElapsedMs = ref(0);
  const isFrozen = ref(false);
  let timerInterval = null;

  function start() {
    stop();
    elapsedMs.value = 0;
    frozenElapsedMs.value = 0;
    isFrozen.value = false;
    timerInterval = setInterval(() => {
      elapsedMs.value += 10;
    }, 10);
  }

  function reset() {
    elapsedMs.value = 0;
    frozenElapsedMs.value = 0;
    isFrozen.value = false;
  }

  function stop() {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function freeze() {
    if (isFrozen.value) return;
    frozenElapsedMs.value = elapsedMs.value;
    isFrozen.value = true;
    stop();
  }

  return { elapsedMs, frozenElapsedMs, isFrozen, start, stop, freeze, reset };
}
