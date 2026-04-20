import { requestAuthLogin, requestAuthRegisterLogin } from '@/services/swagger/auth';
import { Button, Form, Input, Segmented, Space, Typography, message } from 'antd';
import { useState } from 'react';
import { LoginMode } from './constant';
import { phoneReg } from '@/constants/reg';
import { useNavigate } from 'react-router-dom';
import { ApiResponseCode } from '@/services/request';
import ThemeSwitch from '@/components/ThemeSwitch';
import { useUserStore } from '@/store/user';
import './index.scss';

export default function LoginPage() {
  const navigate = useNavigate();
  const setToken = useUserStore((state) => state.setToken);
  const setUserInfo = useUserStore((state) => state.setUserInfo);
  const [mode, setMode] = useState<LoginMode>(LoginMode.LOGIN);
  const [loading, setLoading] = useState(false);

  return (
    <div className="auth-page" style={{ paddingInline: 15 }}>
      <div className="auth-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            LLM Chat
          </Typography.Title>
          <ThemeSwitch />
        </Space>
        <Segmented
          block
          options={[
            { label: '登录', value: LoginMode.LOGIN },
            { label: '注册', value: LoginMode.REGISTER }
          ]}
          value={mode}
          onChange={(v) => setMode(v)}
        />
        <Form
          layout="vertical"
          onFinish={async (values) => {
            try {
              setLoading(true);
              const res =
                mode === LoginMode.LOGIN
                  ? await requestAuthLogin({ phone: values.phone, password: values.password })
                  : await requestAuthRegisterLogin({
                      phone: values.phone,
                      password: values.password,
                      nickname: values.nickname
                    });
              if (res.code === ApiResponseCode.SUCCESS) {
                setToken(res.data.accessToken);
                setUserInfo(res.data.userInfo);
                message.success(res.message || '登录成功');
                navigate('/chat', { replace: true });
              } else {
                message.error(res.message);
              }
            } finally {
              setLoading(false);
            }
          }}>
          {mode === LoginMode.REGISTER && (
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
            {mode === LoginMode.LOGIN ? '登录' : '注册并登录'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
