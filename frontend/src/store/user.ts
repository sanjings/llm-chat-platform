import type { User } from 'types/user';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customJSONStorage } from './storageAdapter';

type UserState = {
  token: string | null;
  userInfo: User | null;
  setToken: (token: string) => void;
  setUserInfo: (userInfo: User) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,
      setToken: (token: string) => set({ token }),
      setUserInfo: (userInfo: User) => set({ userInfo }),
      logout: () => set({ token: null, userInfo: null })
    }),
    { name: 'STORE_USER', storage: customJSONStorage }
  )
);
