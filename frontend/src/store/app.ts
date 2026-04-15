import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export const AppTheme = {
  LIGHT: 'light',
  DARK: 'dark'
} as const;

export type AppTheme = (typeof AppTheme)[keyof typeof AppTheme];

type AppState = {
  themeMode: AppTheme;
  setThemeMode: (themeMode: AppTheme) => void;
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: AppTheme.LIGHT,
      setThemeMode: (themeMode: AppTheme) => set({ themeMode })
    }),
    { name: 'STORE_APP', storage: createJSONStorage(() => localStorage) }
  )
);
