import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customJSONStorage } from './storageAdapter';
import type { RequestAuthLoginResponse } from '@/services/swagger/auth';

type UserState = {
  token: string | null;
  userInfo: RequestAuthLoginResponse['userInfo'] | null;
  setToken: (token: string) => void;
  setUserInfo: (userInfo: RequestAuthLoginResponse['userInfo']) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      userInfo: null,
      setToken: (token: string) => set({ token }),
      setUserInfo: (userInfo: RequestAuthLoginResponse['userInfo']) => set({ userInfo }),
      logout: () => set({ token: null, userInfo: null })
    }),
    { name: 'STORE_USER', storage: customJSONStorage }
  )
);
