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
      collapsed: false,
      setThemeMode: (themeMode: AppTheme) => set({ themeMode }),
      setCollapsed: (collapsed: boolean) => set({ collapsed })
    }),
    { name: 'STORE_APP', storage: createJSONStorage(() => localStorage) }
  )
);
