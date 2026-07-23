import { load } from 'js-yaml';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', '..', '..', '.forgekeeper', 'telemetry.yml');

function resolvePath(p) {
  if (!p || typeof p !== 'string') return p;
  return p.replace(/^~(\/|$)/, os.homedir() + (p.startsWith('~\\') ? '\\' : '/'));
}

function deepMerge(target, source) {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    if (source[key] === null || source[key] === undefined) {
      delete result[key];
    } else if (
      target[key] !== null &&
      target[key] !== undefined &&
      typeof target[key] === 'object' &&
      !Array.isArray(target[key]) &&
      typeof source[key] === 'object' &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key], source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

function validatePatterns(parsers) {
  for (const [serverParsers, patterns] of Object.entries(parsers)) {
    for (const [name, regexStr] of Object.entries(patterns)) {
      try {
        new RegExp(regexStr);
      } catch {
        throw new Error(
          `Invalid regex in parsers.${serverParsers}.${name}: "${regexStr}"`,
        );
      }
    }
  }
}

function resolveLogPaths(config) {
  const result = { ...config };
  if (result.log_path) {
    result.log_path = resolvePath(result.log_path);
  }
  if (result.servers) {
    result.servers = Object.fromEntries(
      Object.entries(result.servers).map(([name, server]) => [
        name,
        {
          ...server,
          log_path: server.log_path ? resolvePath(server.log_path) : undefined,
        },
      ]),
    );
  }
  return result;
}

export function loadConfig() {
  const defaults = {
    parsers: {
      ikllama: {
        progress: 'progress=([\\d.]+)',
        draft_rate: 'draft acceptance rate = ([\\d.]+)',
      },
    },
    events: [
      { type: 'progress', parser: 'ikllama.progress', fields: ['progress'] },
      { type: 'draft_rate', parser: 'ikllama.draft_rate', fields: ['acceptance_rate'] },
    ],
    servers: {},
    log_path: '~/logs/ikllama.log',
  };

  let userConfig = { parsers: { ikllama: {} }, events: [], servers: {}, log_path: undefined };

  if (fs.existsSync(CONFIG_PATH)) {
    userConfig = load(fs.readFileSync(CONFIG_PATH, 'utf-8')) || userConfig;
  }

  const merged = deepMerge(defaults, userConfig);

  if (merged.parsers) {
    validatePatterns(merged.parsers);
  }

  return resolveLogPaths(merged);
}
