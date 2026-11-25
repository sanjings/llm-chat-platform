import { Segmented } from 'antd';
import { useAppStore } from '@/store/app';
import { normalizeThemePreference, THEME_PREFERENCE_OPTIONS, type ThemePreference } from '@/utils/theme';
import './index.scss';

type ThemeSwitchProps = {
  block?: boolean;
};

const ThemeSwitch: React.FC<ThemeSwitchProps> = ({ block = false }) => {
  const themeMode = useAppStore((state) => state.themeMode);
  const setThemeMode = useAppStore((state) => state.setThemeMode);

  return (
    <Segmented
      size={block ? 'middle' : 'small'}
      block={block}
      className={block ? 'theme-switch theme-switch--block' : 'theme-switch'}
      options={THEME_PREFERENCE_OPTIONS}
      value={normalizeThemePreference(themeMode)}
      aria-label="外观主题"
      onChange={(value) => setThemeMode(value as ThemePreference)}
    />
  );
};

export default ThemeSwitch;
