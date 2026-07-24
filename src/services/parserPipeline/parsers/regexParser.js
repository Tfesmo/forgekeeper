import { BaseParser } from "../baseParser.js";

export class RegexParser extends BaseParser {
  constructor(name, regexStr, fieldNames) {
    super(name, new RegExp(regexStr), fieldNames);
  }

  parse(line) {
    const match = line.match(this.regex);
    if (!match) return null;

    const fields = {};
    const captureGroups = match.slice(1);

    for (let i = 0; i < this.fieldNames.length && i < captureGroups.length; i++) {
      const value = captureGroups[i];
      const parsed = parseFloat(value);
      fields[this.fieldNames[i]] = isNaN(parsed) ? value : parsed;
    }

    return fields;
  }
}
