import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { customJSONStorage } from './storageAdapter';
import type { RequestAuthLoginResponse } from '@/services/swagger/auth';

type UserState = {
  token: string | null;
  refreshToken: string | null;
  userInfo: RequestAuthLoginResponse['userInfo'] | null;
  setToken: (token: string) => void;
  setRefreshToken: (refreshToken: string) => void;
  setUserInfo: (userInfo: RequestAuthLoginResponse['userInfo']) => void;
  logout: () => void;
};

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      userInfo: null,
      setToken: (token: string) => set({ token }),
      setRefreshToken: (refreshToken: string) => set({ refreshToken }),
      setUserInfo: (userInfo: RequestAuthLoginResponse['userInfo']) => set({ userInfo }),
      logout: () => {
        set({ token: null, refreshToken: null, userInfo: null });
        window.location.replace('/login');
      }
    }),
    { name: 'STORE_USER', storage: customJSONStorage }
  )
);
