export const AppTheme = {
  LIGHT: 'light',
  DARK: 'dark'
} as const;

export type AppTheme = (typeof AppTheme)[keyof typeof AppTheme];

/** 用户主题偏好；system 表示跟随设备外观。 */
export const ThemePreference = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
} as const;

export type ThemePreference = (typeof ThemePreference)[keyof typeof ThemePreference];

export const THEME_PREFERENCE_OPTIONS: { label: string; value: ThemePreference }[] = [
  { label: '浅色', value: ThemePreference.LIGHT },
  { label: '深色', value: ThemePreference.DARK },
  { label: '跟随系统', value: ThemePreference.SYSTEM }
];

export const DEFAULT_THEME_PREFERENCE: ThemePreference = ThemePreference.SYSTEM;

export const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';

/** 旧版本只存 light/dark，未知值统一回落到默认偏好。 */
export const normalizeThemePreference = (value: unknown): ThemePreference => {
  if (value === ThemePreference.LIGHT || value === ThemePreference.DARK || value === ThemePreference.SYSTEM) {
    return value;
  }
  return DEFAULT_THEME_PREFERENCE;
};

export const resolveSystemTheme = (prefersDark: boolean): AppTheme => (prefersDark ? AppTheme.DARK : AppTheme.LIGHT);

/** 偏好为 system 时使用系统外观，否则使用显式偏好。 */
export const resolveThemePreference = (preference: unknown, systemTheme: AppTheme): AppTheme => {
  const normalized = normalizeThemePreference(preference);
  return normalized === ThemePreference.SYSTEM ? systemTheme : normalized;
};

export const getSystemTheme = (): AppTheme =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? resolveSystemTheme(window.matchMedia(SYSTEM_THEME_QUERY).matches)
    : AppTheme.LIGHT;
