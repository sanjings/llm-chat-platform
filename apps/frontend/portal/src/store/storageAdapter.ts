import { createJSONStorage } from 'zustand/middleware';
import { getCache, setCache, removeCache } from '@/utils/cache';

const customStorage = {
  getItem: (name: string) => {
    return getCache<string>(name);
  },
  setItem: (name: string, value: unknown) => {
    setCache(name, value, 7 * 24 * 60 * 60); // 7天过期
  },
  removeItem: (name: string) => {
    removeCache(name);
  }
};

export const customJSONStorage = createJSONStorage(() => customStorage);
