import { AppTheme, useAppStore } from '@/store/app';
import { Switch } from 'antd';

const ThemeSwitch: React.FC = () => {
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);

  const toggleThemeMode = () => {
    setThemeMode(themeMode === AppTheme.DARK ? AppTheme.LIGHT : AppTheme.DARK);
  };

  return (
    <Switch
      checkedChildren="Dark"
      unCheckedChildren="Light"
      checked={themeMode === AppTheme.DARK}
      onChange={toggleThemeMode}
    />
  );
};

export default ThemeSwitch;
