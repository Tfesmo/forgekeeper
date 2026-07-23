// Singleton telemetry event emitter. Set once at server bootstrap via setEmitter().
// Provides a shared event bus for progress and draft_rate events.
let _emitter = null;

export function getEmitter() {
  return _emitter;
}

export function setEmitter(emitter) {
  _emitter = emitter;
}
