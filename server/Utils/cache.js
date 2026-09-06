const NodeCache = require("node-cache");

// Caching instance configured for low memory footprint (max 500 items, 5 min default TTL)
const appCache = new NodeCache({
  stdTTL: 300,        // 5 minutes TTL
  checkperiod: 60,    // Check for expired keys every 60 seconds
  maxKeys: 500,       // Prevents memory growth on low-RAM client machines
  useClones: false    // Avoid unnecessary cloning for max speed
});

/**
 * Helper to get or fetch data from cache
 * @param {string} key Cache key
 * @param {Function} fetchFn Async function to fetch data if cache miss
 * @param {number} [ttl] Optional custom TTL in seconds
 */
const getOrSetCache = async (key, fetchFn, ttl) => {
  const cachedData = appCache.get(key);
  if (cachedData !== undefined) {
    return cachedData;
  }
  const freshData = await fetchFn();
  if (freshData !== undefined) {
    if (ttl) {
      appCache.set(key, freshData, ttl);
    } else {
      appCache.set(key, freshData);
    }
  }
  return freshData;
};

/**
 * Invalidate cache by key or prefix
 * @param {string|string[]} keys Single key or array of key prefixes/keys
 */
const invalidateCache = (keys) => {
  if (!keys) return;
  const keyList = Array.isArray(keys) ? keys : [keys];
  const allKeys = appCache.keys();
  
  keyList.forEach((targetKey) => {
    allKeys.forEach((k) => {
      if (k === targetKey || k.startsWith(targetKey)) {
        appCache.del(k);
      }
    });
  });
};

module.exports = {
  appCache,
  getOrSetCache,
  invalidateCache,
};
