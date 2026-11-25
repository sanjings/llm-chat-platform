import { requestAuthLogin, requestAuthRegisterLogin } from '@/services/swagger/auth';
import { requestAuthConfig } from '@/services/api/auth';
import { Button, Form, Input, Segmented, Space, Typography, message } from 'antd';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { LoginMode } from './constant';
import { phoneReg } from '@/constants/reg';
import { useNavigate } from 'react-router-dom';
import { ApiResponseCode } from '@/services/request';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useUserStore } from '@/store/user';
import './index.scss';

const registrationClosedMessage = '当前未开放注册';

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useUserStore((state) => state.setToken);
  const setRefreshToken = useUserStore((state) => state.setRefreshToken);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [mode, setMode] = useState<LoginMode>(LoginMode.LOGIN);
  const [loading, setLoading] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    requestAuthConfig()
      .then((config) => {
        if (cancelled) return;
        setRegistrationEnabled(config.registrationEnabled);
        if (!config.registrationEnabled) setMode(LoginMode.LOGIN);
      })
      .catch((error: unknown) => {
        if (cancelled || axios.isAxiosError(error) || axios.isCancel(error)) return;
        message.error(error instanceof Error ? error.message : '登录配置加载失败');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const registering = registrationEnabled && mode === LoginMode.REGISTER;

  return (
    <div className="auth-page" style={{ paddingInline: 15 }}>
      <div className="auth-card">
        <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            LLM Chat
          </Typography.Title>
          <ThemeSwitch />
        </Space>
        {registrationEnabled && (
          <Segmented
            block
            options={[
              { label: '登录', value: LoginMode.LOGIN },
              { label: '注册', value: LoginMode.REGISTER }
            ]}
            value={mode}
            onChange={(v) => setMode(v)}
          />
        )}
        <Form
          layout="vertical"
          onFinish={async (values) => {
            try {
              setLoading(true);
              const res = registering
                ? await requestAuthRegisterLogin({
                    phone: values.phone,
                    password: values.password,
                    nickname: values.nickname
                  })
                : await requestAuthLogin({ phone: values.phone, password: values.password });
              if (res.code === ApiResponseCode.SUCCESS) {
                setToken(res.data.accessToken);
                setRefreshToken(res.data.refreshToken);
                setUserInfo(res.data.userInfo);
                message.success(res.message || '登录成功');
                navigate('/chat', { replace: true });
              } else {
                message.error(res.message);
                if (registering && res.message === registrationClosedMessage) {
                  setRegistrationEnabled(false);
                  setMode(LoginMode.LOGIN);
                }
              }
            } finally {
              setLoading(false);
            }
          }}>
          {registering && (
            <>
              <Form.Item name="nickname" label="昵称" rules={[{ required: true, message: '请输入昵称' }]}>
                <Input placeholder="请输入昵称" />
              </Form.Item>
            </>
          )}
          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ required: true, pattern: phoneReg, message: '请输入正确的手机号' }]}>
            <Input placeholder="请输入手机号" maxLength={11} />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[{ required: true, min: 6, max: 32, message: '请输入6-32位密码' }]}>
            <Input.Password placeholder="请输入密码" maxLength={32} />
          </Form.Item>
          <Button block type="primary" size="large" htmlType="submit" loading={loading}>
            {registering ? '注册并登录' : '登录'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
