#!/usr/bin/env node

import { createParserRegistry, registerParsers } from '../src/services/parserPipeline/parsers/index.js';
import { loadConfig } from '../src/services/parserPipeline/config.js';
import fs from 'node:fs';
import os from 'node:os';

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const logPath = args[1] || process.env.TELEMETRY_LOG || '~/logs/ikllama.log';

  return { command, logPath };
}

function runLogTelemetry(logPath) {
  const config = loadConfig();
  const parserRegistry = createParserRegistry();
  registerParsers(parserRegistry, config.parsers || {}, config.events || []);

  // Resolve path
  const resolvedPath = logPath.replace(/^~(\/|$)/, os.homedir() + (logPath.startsWith('~\\') ? '\\' : '/'));

  if (!fs.existsSync(resolvedPath)) {
    console.error(`Log file not found: ${resolvedPath}`);
    process.exit(1);
  }

  let lineCount = 0;
  let matchCount = 0;
  const eventCounts = {};

  const stream = fs.createReadStream(resolvedPath, { encoding: 'utf8' });
  let buffer = '';

  stream.on('data', (chunk) => {
    buffer += chunk;
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.trim()) continue;
      lineCount++;

      for (const [eventType, parser] of parserRegistry) {
        const fields = parser.parse(line);
        if (fields) {
          matchCount++;
          eventCounts[eventType] = (eventCounts[eventType] || 0) + 1;

          const fieldStr = Object.entries(fields)
            .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
            .join(', ');
          console.log(`[${eventType}] ${fieldStr}`);
          break;
        }
      }
    }
  });

  stream.on('end', () => {
    console.log(`\n--- Summary ---`);
    console.log(`Lines processed: ${lineCount}`);
    console.log(`Matches: ${matchCount}`);
    for (const [type, count] of Object.entries(eventCounts)) {
      console.log(`  ${type}: ${count}`);
    }
  });
}

function main() {
  const { command, logPath } = parseArgs();

  if (command === 'log-telemetry') {
    runLogTelemetry(logPath);
  } else {
    console.log('forgekeeper CLI');
    console.log('Usage: forgekeeper log-telemetry [log-path]');
    process.exit(1);
  }
}

main();
