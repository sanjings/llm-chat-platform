import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';
import { resolveSettingsReturnPath } from './settingsNavigation';
import './index.scss';

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const narrowLayout = useNarrowLayout();
  const returnPath = resolveSettingsReturnPath(location.state);

  return (
    <div className="settings-page">
      <header className="settings-page__header">
        <Button
          type="text"
          icon={<ArrowLeftOutlined />}
          className="settings-page__back"
          aria-label="返回对话"
          onClick={() => navigate(returnPath, { replace: true })}>
          {!narrowLayout && '返回对话'}
        </Button>
        <Typography.Title level={4} className="settings-page__title">
          设置
        </Typography.Title>
      </header>

      <main className="settings-page__main">
        <section className="settings-page__card">
          <Typography.Title level={5} className="settings-page__section-title">
            外观
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="settings-page__description">
            选择界面主题；跟随系统会随设备外观自动切换。
          </Typography.Paragraph>
          <ThemeSwitch block />
        </section>
      </main>
    </div>
  );
}
