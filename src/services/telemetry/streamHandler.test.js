import { EventEmitter } from "events";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, it, expect } from "vitest";

import { createSseConnection } from "./streamHandler.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function makeMockRes() {
  const sentEvents = [];
  return {
    write: (chunk) => sentEvents.push(chunk),
    writeHead: () => {},
    flushHeaders: () => {},
    on: () => {},
  };
}

describe("streamHandler", () => {
  it("should subscribe to memory events and filter fields", () => {
    const emitter = new EventEmitter();
    const registeredEvents = [];
    emitter.on = (event, fn) => {
      registeredEvents.push(event);
      EventEmitter.prototype.on.call(emitter, event, fn);
    };

    const mockRes = makeMockRes();
    createSseConnection(mockRes, emitter);

    expect(registeredEvents).toContain("memory");
  });

  it("should emit filtered memory data through the SSE writer", () => {
    const emitter = new EventEmitter();
    const sentEvents = [];
    const mockRes = {
      write: (chunk) => sentEvents.push(chunk),
      writeHead: () => {},
      flushHeaders: () => {},
      on: () => {},
    };

    createSseConnection(mockRes, emitter);

    emitter.emit("memory", {
      rss: 123456789,
      timestamp: 98765,
      extraField: "should be filtered out",
    });

    const memoryEvent = sentEvents.find((e) => e.includes("event: memory"));
    expect(memoryEvent).toBeDefined();
    const memoryData = JSON.parse(memoryEvent.replace(/^event:.*\ndata: /, ""));
    expect(memoryData.rss).toBe(123456789);
    expect(memoryData.timestamp).toBe(98765);
    expect(memoryData.extraField).toBeUndefined();
    expect(memoryData.seq).toBeDefined();
  });

  it("should include rss and timestamp in memory event but not extra fields", () => {
    const emitter = new EventEmitter();
    const sentEvents = [];
    const mockRes = {
      write: (chunk) => sentEvents.push(chunk),
      writeHead: () => {},
      flushHeaders: () => {},
      on: () => {},
    };

    createSseConnection(mockRes, emitter);

    emitter.emit("memory", {
      rss: 500000000,
      timestamp: 100,
      heapUsed: 200,
      external: 300,
      totalHeapSize: 400,
    });

    const memoryEvent = sentEvents.find((e) => e.includes("event: memory"));
    const memoryData = JSON.parse(memoryEvent.replace(/^event:.*\ndata: /, ""));
    expect(memoryData.rss).toBe(500000000);
    expect(memoryData.timestamp).toBe(100);
    expect(memoryData.heapUsed).toBeUndefined();
    expect(memoryData.external).toBeUndefined();
    expect(memoryData.totalHeapSize).toBeUndefined();
  });
});
