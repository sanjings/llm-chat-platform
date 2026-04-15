const { VITE_CACHE_VERSION } = import.meta.env;

/**
 * 设置缓存
 * @param key 缓存key
 * @param value 缓存value
 * @param expires 缓存过期时间，单位：秒 默认30天
 */
export const setCache = <T = unknown>(key: string, value: T, expires: number = 30 * 24 * 60 * 60): void => {
  const cache = {
    value,
    version: VITE_CACHE_VERSION,
    expires: Date.now() + expires * 1000
  };
  localStorage.setItem(key, JSON.stringify(cache));
};

/**
 * 获取缓存
 * @param key 缓存key
 * @returns 缓存value
 */
export const getCache = <T = unknown>(key: string): T | null => {
  const dataStr = localStorage.getItem(key);
  if (!dataStr) return null;
  const cache = JSON.parse(dataStr);
  if (cache?.expires && cache?.expires < Date.now()) {
    removeCache(key);
    return null;
  }
  if (cache?.version && cache?.version !== VITE_CACHE_VERSION) {
    removeCache(key);
    return null;
  }
  return (cache?.value ? cache.value : cache || null) as T;
};

/**
 * 删除缓存
 * @param key 缓存key
 */
export const removeCache = (key: string): void => {
  localStorage.removeItem(key);
};

/**
 * 清空缓存
 */
export const clearCache = () => localStorage.clear();
