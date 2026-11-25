import { isMobile } from '@/utils/env';
import {
  DEFAULT_THEME_PREFERENCE,
  getSystemTheme,
  normalizeThemePreference,
  resolveThemePreference,
  type AppTheme,
  type ThemePreference
} from '@/utils/theme';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export { AppTheme, ThemePreference } from '@/utils/theme';

type AppState = {
  /** 用户偏好；字段名沿用 themeMode，兼容旧版本已存储的 light/dark。 */
  themeMode: ThemePreference;
  systemTheme: AppTheme;
  collapsed: boolean;
  setThemeMode: (themeMode: ThemePreference) => void;
  setSystemTheme: (systemTheme: AppTheme) => void;
  setCollapsed: (collapsed: boolean) => void;
};

export const selectResolvedTheme = (state: AppState) => resolveThemePreference(state.themeMode, state.systemTheme);

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      themeMode: DEFAULT_THEME_PREFERENCE,
      systemTheme: getSystemTheme(),
      collapsed: !!isMobile,
      setThemeMode: (themeMode: ThemePreference) => set({ themeMode: normalizeThemePreference(themeMode) }),
      setSystemTheme: (systemTheme: AppTheme) => set({ systemTheme }),
      setCollapsed: (collapsed: boolean) => set({ collapsed })
    }),
    {
      name: 'STORE_APP',
      partialize: (state) => ({ themeMode: state.themeMode }),
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState> | undefined;
        return {
          ...currentState,
          ...persisted,
          themeMode: normalizeThemePreference(persisted?.themeMode)
        };
      }
    }
  )
);
