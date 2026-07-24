export function deepMerge(target, source, options = {}) {
  const { deleteNulls } = options;
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (deleteNulls && (value === null || value === undefined)) {
      delete result[key];
    } else if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] !== undefined &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
    ) {
      result[key] = deepMerge(result[key], value, options);
    } else {
      result[key] = value;
    }
  }
  return result;
}
