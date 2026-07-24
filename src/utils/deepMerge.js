function isPlainObject(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

export function deepMerge(target, source, options = {}) {
  const { deleteNulls } = options;
  const result = { ...target };
  for (const [key, value] of Object.entries(source)) {
    if (deleteNulls && (value === null || value === undefined)) {
      delete result[key];
    } else if (isPlainObject(value) && isPlainObject(result[key])) {
      result[key] = deepMerge(result[key], value, options);
    } else {
      result[key] = value;
    }
  }
  return result;
}
