import { ConfigProvider, theme } from 'antd';
import Router from './router';
import { AppTheme, useAppStore } from './store/app';
import { useEffect } from 'react';
import zhCN from 'antd/locale/zh_CN';

export default function App() {
  const themeMode = useAppStore((state) => state.themeMode);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeMode === AppTheme.DARK ? 'dark' : 'light');
  }, [themeMode]);

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: themeMode === AppTheme.DARK ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorLink: themeMode === AppTheme.DARK ? '#69b1ff' : '#1677ff',
          colorPrimary: themeMode === AppTheme.DARK ? '#1668dc' : '#1677ff'
        }
      }}
    >
      <Router />
    </ConfigProvider>
  );
}
