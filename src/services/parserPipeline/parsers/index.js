import { RegexParser } from "./regexParser.js";

export function registerParsers(registry, parsersConfig, eventConfig) {
  for (const event of eventConfig) {
    const parserKey = event.parser;
    const [parserName, patternKey] = parserKey.split(".");
    const parserGroup = parsersConfig[parserName];
    const regexStr = parserGroup?.[patternKey];
    const fieldNames = event.fields || [];

    if (!regexStr) {
      console.warn(`[pipeline] no pattern for "${parserName}.${patternKey}", skipping`);
      continue;
    }

    registry.set(event.type, new RegexParser(`${parserName}.${patternKey}`, regexStr, fieldNames));
  }
}
