import { ArrowLeftOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Segmented, Typography, message, type FormInstance } from 'antd';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';
import { requestLogoutAllDevices, updateCurrentUserPassword } from '@/services/api/auth';
import { requestChatModels, type ChatModelOption } from '@/services/api/chat';
import {
  requestUserDefaultModel,
  requestUserProfile,
  updateUserDefaultModel,
  updateUserProfile,
  type UserProfile
} from '@/services/api/user';
import { useUserStore } from '@/store/user';
import { resolveEffectiveModelId, unavailableReasons } from '@/utils/defaultModel';
import { validateNickname } from '@/utils/nickname';
import { validatePassword } from '@/utils/password';
import { resolveSettingsReturnPath } from './settingsNavigation';
import './index.scss';

const nicknameRules = [
  {
    validator: async (_: unknown, value: string) => {
      const error = validateNickname(typeof value === 'string' ? value : '');
      if (error) throw new Error(error);
    }
  }
];

const passwordRules = [
  {
    validator: async (_: unknown, value: string) => {
      const error = validatePassword(typeof value === 'string' ? value : '');
      if (error) throw new Error(error);
    }
  }
];

const confirmNewPasswordRules = [
  ({ getFieldValue }: { getFieldValue: (name: string) => string }) => ({
    validator: async (_: unknown, value: string) => {
      if (value !== getFieldValue('newPassword')) {
        throw new Error('两次输入的新密码不一致');
      }
    }
  })
];

const applyCurrentUserProfile = (
  profile: UserProfile,
  form: FormInstance<{ nickname: string }>,
  setPhone: (phone: string) => void,
  setSavedNickname: (nickname: string) => void
) => {
  setPhone(profile.phone);
  setSavedNickname(profile.nickname);
  form.setFieldsValue({ nickname: profile.nickname });
  const current = useUserStore.getState().userInfo;
  if (current) {
    useUserStore.getState().setUserInfo({ ...current, nickname: profile.nickname, phone: profile.phone });
  }
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const narrowLayout = useNarrowLayout();
  const returnPath = resolveSettingsReturnPath(location.state);
  const [profileForm] = Form.useForm<{ nickname: string }>();
  const nicknameDraft = Form.useWatch('nickname', profileForm);
  const [phone, setPhone] = useState('');
  const [savedNickname, setSavedNickname] = useState('');
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [passwordForm] = Form.useForm<{
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }>();
  const currentPasswordDraft = Form.useWatch('currentPassword', passwordForm);
  const newPasswordDraft = Form.useWatch('newPassword', passwordForm);
  const confirmNewPasswordDraft = Form.useWatch('confirmNewPassword', passwordForm);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);
  const [models, setModels] = useState<ChatModelOption[]>([]);
  const [savedDefaultId, setSavedDefaultId] = useState<string | null>(null);
  const [systemDefaultId, setSystemDefaultId] = useState('');
  const [effectiveModelId, setEffectiveModelId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    requestUserProfile()
      .then((profile) => {
        if (cancelled) return;
        applyCurrentUserProfile(profile, profileForm, setPhone, setSavedNickname);
        setProfileError('');
      })
      .catch(() => {
        if (cancelled) return;
        setProfileError('账号资料加载失败，请稍后重试');
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profileForm]);

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

  const handleSaveProfile = (values: { nickname: string }) => {
    if (profileSaving || values.nickname === savedNickname) return;
    setProfileSaving(true);
    updateUserProfile(values.nickname)
      .then((profile) => {
        applyCurrentUserProfile(profile, profileForm, setPhone, setSavedNickname);
        message.success('昵称已保存');
      })
      .catch((error: unknown) => {
        profileForm.setFieldsValue({ nickname: savedNickname });
        const alreadyToasted = Boolean(error && typeof error === 'object' && 'response' in error);
        if (!alreadyToasted) {
          message.error(error instanceof Error ? error.message : '资料保存失败');
        }
      })
      .finally(() => {
        setProfileSaving(false);
      });
  };

  const handleChangePassword = (values: {
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
  }) => {
    if (passwordSaving) return;
    setPasswordSaving(true);
    updateCurrentUserPassword(values)
      .then(() => {
        passwordForm.resetFields();
        message.success('密码已修改');
      })
      .catch((error: unknown) => {
        const alreadyToasted = Boolean(error && typeof error === 'object' && 'response' in error);
        if (!alreadyToasted) {
          message.error(error instanceof Error ? error.message : '密码修改失败');
        }
      })
      .finally(() => {
        setPasswordSaving(false);
      });
  };

  const handleLogoutAll = () => {
    Modal.confirm({
      title: '退出全部设备',
      content: '将立即退出全部已登录设备，包括当前设备，需要重新登录。',
      okText: '退出全部设备',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: () => {
        setLogoutAllLoading(true);
        return requestLogoutAllDevices()
          .then(() => {
            useUserStore.getState().logout();
          })
          .catch((error: unknown) => {
            const alreadyToasted = Boolean(error && typeof error === 'object' && 'response' in error);
            if (!alreadyToasted) {
              message.error(error instanceof Error ? error.message : '退出全部设备失败');
            }
            return Promise.reject(error);
          })
          .finally(() => {
            setLogoutAllLoading(false);
          });
      }
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
            账号资料
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="settings-page__description">
            查看当前账号资料。可以修改昵称，手机号只读不可改。
          </Typography.Paragraph>
          {profileError ? (
            <Typography.Text type="danger">{profileError}</Typography.Text>
          ) : (
            <Form
              form={profileForm}
              layout="vertical"
              className="settings-page__profile-form"
              onFinish={handleSaveProfile}>
              <Form.Item name="nickname" label="昵称" rules={nicknameRules} className="settings-page__profile-field">
                <Input placeholder="请输入昵称" disabled={profileLoading || profileSaving} allowClear />
              </Form.Item>
              <Form.Item label="手机号" className="settings-page__profile-field">
                <Input value={phone} disabled readOnly />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={profileSaving}
                disabled={profileLoading || profileSaving || nicknameDraft === savedNickname}>
                保存
              </Button>
            </Form>
          )}
        </section>

        <section className="settings-page__card">
          <Typography.Title level={5} className="settings-page__section-title">
            登录密码
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="settings-page__description">
            修改登录密码需要验证当前密码。也可以退出全部已登录设备，包括当前设备。
          </Typography.Paragraph>
          <Form
            form={passwordForm}
            layout="vertical"
            className="settings-page__profile-form"
            onFinish={handleChangePassword}>
            <Form.Item
              name="currentPassword"
              label="当前密码"
              rules={passwordRules}
              className="settings-page__profile-field">
              <Input.Password placeholder="请输入当前密码" maxLength={32} disabled={passwordSaving} />
            </Form.Item>
            <Form.Item name="newPassword" label="新密码" rules={passwordRules} className="settings-page__profile-field">
              <Input.Password placeholder="请输入6-32位新密码" maxLength={32} disabled={passwordSaving} />
            </Form.Item>
            <Form.Item
              name="confirmNewPassword"
              label="确认新密码"
              dependencies={['newPassword']}
              rules={[...passwordRules, ...confirmNewPasswordRules]}
              className="settings-page__profile-field">
              <Input.Password placeholder="请再次输入新密码" maxLength={32} disabled={passwordSaving} />
            </Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={passwordSaving}
              disabled={passwordSaving || !currentPasswordDraft || !newPasswordDraft || !confirmNewPasswordDraft}>
              修改密码
            </Button>
          </Form>
          <div className="settings-page__security-actions">
            <Button
              danger
              loading={logoutAllLoading}
              disabled={logoutAllLoading || passwordSaving}
              onClick={handleLogoutAll}>
              退出全部设备
            </Button>
          </div>
        </section>

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
