import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Empty, Typography } from 'antd';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';
import { resolveSettingsReturnPath, SETTINGS_EMPTY_DESCRIPTION } from './settingsNavigation';
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
          <Typography.Paragraph type="secondary" className="settings-page__description">
            管理账号与应用偏好。当前版本暂未开放具体配置项。
          </Typography.Paragraph>
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={SETTINGS_EMPTY_DESCRIPTION} />
        </section>
      </main>
    </div>
  );
}
