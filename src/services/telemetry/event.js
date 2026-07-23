export function createEvent(type, server, fields, rawLine) {
  return {
    type,
    server,
    timestamp: Date.now(),
    fields,
    rawLine,
  };
}
