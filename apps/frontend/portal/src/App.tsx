import { ConfigProvider, theme } from 'antd';
import Router from './router';
import { selectResolvedTheme, useAppStore } from './store/app';
import { useEffect } from 'react';
import zhCN from 'antd/locale/zh_CN';
import { AppTheme, resolveSystemTheme, SYSTEM_THEME_QUERY, ThemePreference } from './utils/theme';

export default function App() {
  const themeMode = useAppStore((state) => state.themeMode);
  const setSystemTheme = useAppStore((state) => state.setSystemTheme);
  const resolvedTheme = useAppStore(selectResolvedTheme);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', resolvedTheme);
  }, [resolvedTheme]);

  useEffect(() => {
    if (themeMode !== ThemePreference.SYSTEM) return;

    const mediaQuery = window.matchMedia(SYSTEM_THEME_QUERY);
    const syncSystemTheme = () => setSystemTheme(resolveSystemTheme(mediaQuery.matches));
    syncSystemTheme();
    mediaQuery.addEventListener('change', syncSystemTheme);
    return () => mediaQuery.removeEventListener('change', syncSystemTheme);
  }, [themeMode, setSystemTheme]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: resolvedTheme === AppTheme.DARK ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorLink: resolvedTheme === AppTheme.DARK ? '#69b1ff' : '#1677ff',
          colorPrimary: resolvedTheme === AppTheme.DARK ? '#1668dc' : '#1677ff'
        }
      }}>
      <Router />
    </ConfigProvider>
  );
}
