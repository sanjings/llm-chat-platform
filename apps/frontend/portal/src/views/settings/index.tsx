import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Segmented, Typography } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';
import { requestChatModels, type ChatModelOption } from '@/services/api/chat';
import { requestUserDefaultModel, updateUserDefaultModel } from '@/services/api/user';
import { resolveEffectiveModelId, unavailableReasons } from '@/utils/defaultModel';
import { resolveSettingsReturnPath } from './settingsNavigation';
import './index.scss';

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const narrowLayout = useNarrowLayout();
  const returnPath = resolveSettingsReturnPath(location.state);
  const [models, setModels] = useState<ChatModelOption[]>([]);
  const [savedDefaultId, setSavedDefaultId] = useState<string | null>(null);
  const [systemDefaultId, setSystemDefaultId] = useState('');
  const [effectiveModelId, setEffectiveModelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    Promise.all([requestChatModels(), requestUserDefaultModel()])
      .then(([{ models: list, defaultModelId }, preference]) => {
        if (cancelled) return;
        const effective =
          preference.effectiveModelId || resolveEffectiveModelId(preference.defaultModelId, list, defaultModelId);
        setModels(list);
        setSystemDefaultId(defaultModelId);
        setSavedDefaultId(preference.defaultModelId);
        setEffectiveModelId(effective);
        setLoadError('');
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError('默认模型列表加载失败，请稍后重试');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const savedUnavailable = Boolean(
    savedDefaultId && !models.some((item) => item.id === savedDefaultId && item.available)
  );
  const savedUnavailableReason =
    (savedDefaultId && models.find((item) => item.id === savedDefaultId)?.unavailableReason?.trim()) ||
    '该模型当前不可用或不在当前部署的可选列表中';

  const handleChange = (value: string) => {
    if (saving || value === savedDefaultId) return;
    const previousSaved = savedDefaultId;
    const previousEffective = effectiveModelId;
    setSavedDefaultId(value);
    setEffectiveModelId(value);
    setSaving(true);
    updateUserDefaultModel(value)
      .then((preference) => {
        setSavedDefaultId(preference.defaultModelId);
        setEffectiveModelId(
          preference.effectiveModelId || resolveEffectiveModelId(preference.defaultModelId, models, systemDefaultId)
        );
      })
      .catch(() => {
        setSavedDefaultId(previousSaved);
        setEffectiveModelId(previousEffective);
      })
      .finally(() => {
        setSaving(false);
      });
  };

  const reasons = unavailableReasons(models);

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

        <section className="settings-page__card">
          <Typography.Title level={5} className="settings-page__section-title">
            默认模型
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="settings-page__description">
            选择新会话使用的默认模型。列表和可用性以当前部署为准；在某个新会话里临时改选不会改写这里的默认。
          </Typography.Paragraph>
          {loadError ? (
            <Typography.Text type="danger">{loadError}</Typography.Text>
          ) : (
            <>
              <div className="settings-page__model-options">
                <Segmented<string>
                  block
                  vertical={narrowLayout}
                  value={effectiveModelId || undefined}
                  disabled={loading || saving || !models.some((item) => item.available)}
                  options={models.map((item) => ({
                    label: item.id,
                    value: item.id,
                    disabled: !item.available
                  }))}
                  onChange={handleChange}
                />
              </div>
              {savedUnavailable && savedDefaultId ? (
                <Typography.Paragraph type="warning" className="settings-page__effective">
                  已保存的默认模型 {savedDefaultId} 当前不可用（{savedUnavailableReason}）。新会话实际使用{' '}
                  {effectiveModelId || '当前可用模型'}。
                </Typography.Paragraph>
              ) : null}
              {!savedDefaultId && effectiveModelId ? (
                <Typography.Paragraph type="secondary" className="settings-page__effective">
                  尚未设置个人默认，新会话当前实际使用 {effectiveModelId}。
                </Typography.Paragraph>
              ) : null}
              {savedDefaultId && !savedUnavailable && effectiveModelId && savedDefaultId === effectiveModelId ? (
                <Typography.Paragraph type="secondary" className="settings-page__effective">
                  新会话将使用 {effectiveModelId}。
                </Typography.Paragraph>
              ) : null}
              {reasons.map((reason) => (
                <Typography.Paragraph key={reason} type="warning" className="settings-page__effective">
                  {reason}
                </Typography.Paragraph>
              ))}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
