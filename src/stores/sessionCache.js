import { MAX_CACHE_SIZE } from "../config/cache.js";

const sessionCache = new Map();

export { sessionCache };

export function evictOldest() {
  const firstKey = sessionCache.keys().next().value;
  sessionCache.delete(firstKey);
}

export function cacheSet(key, value) {
  sessionCache.set(key, value);
  if (sessionCache.size > MAX_CACHE_SIZE) {
    evictOldest();
  }
}

export function cacheDelete(key) {
  sessionCache.delete(key);
}

export function getCacheSize() {
  return sessionCache.size;
}
