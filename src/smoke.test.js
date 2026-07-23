import { describe, it, vi } from 'vitest';

vi.mock('tail-file', () => ({
  default: class MockTail {
    on() { return this; }
    start() { return this; }
  },
}));

describe('module loading smoke test', () => {
  it('parser pipeline config loads', async () => {
    const { loadConfig } = await import('./services/parserPipeline/config.js');
    const config = loadConfig();
    if (!config.parsers?.ikllama) {
      throw new Error('Missing ikllama parsers in config');
    }
  });

  it('parser pipeline creates without error', async () => {
    const { loadConfig } = await import('./services/parserPipeline/config.js');
    const { createPipeline } = await import('./services/parserPipeline/pipeline.js');
    const config = loadConfig();
    const pipeline = createPipeline(config);
    if (!pipeline.emitter) {
      throw new Error('Pipeline missing emitter');
    }
  });

  it('log monitor module loads', async () => {
    const { tailLogFile } = await import('./services/logMonitor.js');
    if (typeof tailLogFile !== 'function') {
      throw new Error('tailLogFile is not a function');
    }
  });

  it('telemetry shared module loads', async () => {
    const { setEmitter, getEmitter } = await import('./services/telemetry/shared.js');
    if (typeof setEmitter !== 'function' || typeof getEmitter !== 'function') {
      throw new Error('telemetry shared exports are not functions');
    }
  });

  it('telemetry emitter loads', async () => {
    const { loadConfig } = await import('./services/parserPipeline/config.js');
    const { createPipeline } = await import('./services/parserPipeline/pipeline.js');
    const config = loadConfig();
    const pipeline = createPipeline(config);
    if (typeof pipeline.emitter.emit !== 'function') {
      throw new Error('emitter missing emit');
    }
  });

  it('session routes module loads', async () => {
    const { sessionRoutes } = await import('./routes/sessionRoutes.js');
    if (!sessionRoutes) {
      throw new Error('sessionRoutes is falsy');
    }
  });
});
