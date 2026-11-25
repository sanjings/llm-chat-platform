import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  AppTheme,
  DEFAULT_THEME_PREFERENCE,
  normalizeThemePreference,
  resolveSystemTheme,
  resolveThemePreference,
  SYSTEM_THEME_QUERY,
  THEME_PREFERENCE_OPTIONS,
  ThemePreference
} from '../src/utils/theme.ts';

const readSource = (relativePath: string) =>
  readFileSync(new URL(`../../src/${relativePath}`, import.meta.url), 'utf8');

test('未存储时默认跟随系统，旧版 light/dark 偏好保持原样', () => {
  assert.equal(DEFAULT_THEME_PREFERENCE, ThemePreference.SYSTEM);
  assert.equal(resolveThemePreference(AppTheme.LIGHT, AppTheme.DARK), AppTheme.LIGHT);
  assert.equal(resolveThemePreference(AppTheme.DARK, AppTheme.LIGHT), AppTheme.DARK);
});

test('跟随系统时按 prefers-color-scheme 解析出实际外观', () => {
  assert.equal(SYSTEM_THEME_QUERY, '(prefers-color-scheme: dark)');
  assert.equal(resolveSystemTheme(true), AppTheme.DARK);
  assert.equal(resolveSystemTheme(false), AppTheme.LIGHT);
  assert.equal(resolveThemePreference(ThemePreference.SYSTEM, AppTheme.DARK), AppTheme.DARK);
  assert.equal(resolveThemePreference(ThemePreference.SYSTEM, AppTheme.LIGHT), AppTheme.LIGHT);
});

test('非法或缺失的偏好回落到跟随系统', () => {
  for (const value of [undefined, null, '', 'auto', 'Dark', 1, {}]) {
    assert.equal(normalizeThemePreference(value), ThemePreference.SYSTEM);
    assert.equal(resolveThemePreference(value, AppTheme.DARK), AppTheme.DARK);
    assert.equal(resolveThemePreference(value, AppTheme.LIGHT), AppTheme.LIGHT);
  }
});

test('设置页、侧栏和登录页开关共用同一持久化偏好与解析结果', () => {
  const storeSource = readSource('store/app.ts');
  const appSource = readSource('App.tsx');
  const settingsSource = readSource('views/settings/index.tsx');
  const themeSwitchSource = readSource('components/ThemeSwitch/index.tsx');

  assert.match(storeSource, /name: 'STORE_APP'/);
  assert.match(storeSource, /partialize: \(state\) => \(\{ themeMode: state\.themeMode \}\)/);
  assert.match(storeSource, /themeMode: DEFAULT_THEME_PREFERENCE/);
  assert.match(storeSource, /selectResolvedTheme/);

  assert.match(appSource, /useAppStore\(selectResolvedTheme\)/);
  assert.match(appSource, /themeMode !== ThemePreference\.SYSTEM/);
  assert.match(appSource, /window\.matchMedia\(SYSTEM_THEME_QUERY\)/);
  assert.match(appSource, /removeEventListener\('change', syncSystemTheme\)/);

  assert.match(settingsSource, /<ThemeSwitch block \/>/);
  assert.match(settingsSource, /跟随系统会随设备外观自动切换/);
  assert.doesNotMatch(settingsSource, /暂无可配置项|Empty/);

  assert.match(themeSwitchSource, /state\.themeMode/);
  assert.match(themeSwitchSource, /state\.setThemeMode/);
  assert.match(themeSwitchSource, /THEME_PREFERENCE_OPTIONS/);
  assert.match(themeSwitchSource, /ThemePreference/);
  assert.doesNotMatch(themeSwitchSource, /selectResolvedTheme|resolvedTheme === AppTheme\.DARK/);

  assert.match(readSource('utils/theme.ts'), /跟随系统/);
  assert.equal(
    THEME_PREFERENCE_OPTIONS.map((option) => option.value).join(','),
    [ThemePreference.LIGHT, ThemePreference.DARK, ThemePreference.SYSTEM].join(',')
  );
});
