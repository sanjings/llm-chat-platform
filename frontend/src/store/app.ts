import { isMobile } from '@/utils/env';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const AppTheme = {
  LIGHT: 'light',
  DARK: 'dark'
} as const;

export type AppTheme = (typeof AppTheme)[keyof typeof AppTheme];

type AppState = {
  themeMode: AppTheme;
  collapsed: boolean;
  setThemeMode: (themeMode: AppTheme) => void;
  setCollapsed: (collapsed: boolean) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: AppTheme.LIGHT,
      collapsed: !!isMobile,
      setThemeMode: (themeMode: AppTheme) => set({ themeMode }),
      setCollapsed: (collapsed: boolean) => set({ collapsed })
    }),
    {
      name: 'STORE_APP',
      partialize: (state) => ({ themeMode: state.themeMode }),
      storage: createJSONStorage(() => localStorage)
    }
  )
);
