import { RegexParser } from "./regexParser.js";

export function createParserRegistry() {
  return new Map();
}

export function registerParsers(registry, parsersConfig, eventConfig) {
  for (const event of eventConfig) {
    const parserKey = event.parser;
    const [parserName, patternKey] = parserKey.split(".");
    const parserGroup = parsersConfig[parserName];
    const regexStr = parserGroup?.[patternKey];
    const fieldNames = event.fields || [];

    if (!regexStr) {
      continue;
    }

    registry.set(event.type, new RegexParser(`${parserName}.${patternKey}`, regexStr, fieldNames));
  }
}
