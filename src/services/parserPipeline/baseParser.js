export class BaseParser {
  constructor(name, regex, fieldNames) {
    this.name = name;
    this.regex = regex;
    this.fieldNames = fieldNames;
  }

  parse(_line) {
    throw new Error("parse() must be implemented");
  }
}
