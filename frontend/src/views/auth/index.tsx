import { login, register } from '@/services/api/auth';
import { setToken } from '@/services/request';
import { Button, Form, Input, Segmented, Space, Switch, Typography, Upload, message } from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { useState } from 'react';

interface AuthPageProps {
  darkMode: boolean;
  onChangeDarkMode: (value: boolean) => void;
  onAuthSuccess: () => void;
}

export default function AuthPage({ darkMode, onChangeDarkMode, onAuthSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [avatar, setAvatar] = useState<string>();

  const beforeUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      setAvatar(String(reader.result || ''));
    };
    reader.readAsDataURL(file);
    return false;
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            LLM Chat Platform
          </Typography.Title>
          <Space>
            <span>深色</span>
            <Switch checked={darkMode} onChange={onChangeDarkMode} />
          </Space>
        </Space>
        <Segmented
          block
          options={[
            { label: '登录', value: 'login' },
            { label: '注册', value: 'register' }
          ]}
          value={mode}
          onChange={(v) => setMode(v as 'login' | 'register')}
        />
        <Form
          layout="vertical"
          onFinish={async (values) => {
            try {
              const result =
                mode === 'login'
                  ? await login({ phone: values.phone, password: values.password })
                  : await register({
                      phone: values.phone,
                      password: values.password,
                      nickname: values.nickname || '新用户',
                      avatar
                    });
              setToken(result.accessToken);
              message.success(mode === 'login' ? '登录成功' : '注册成功');
              onAuthSuccess();
            } catch (err) {
              message.error(err instanceof Error ? err.message : '操作失败');
            }
          }}
        >
          {mode === 'register' && (
            <>
              <Form.Item name="nickname" label="昵称" rules={[{ required: true }]}>
                <Input placeholder="请输入昵称" />
              </Form.Item>
              <Form.Item label="头像">
                <Upload
                  listType="picture"
                  beforeUpload={beforeUpload}
                  maxCount={1}
                  onRemove={() => setAvatar(undefined)}
                  fileList={avatar ? ([{ uid: 'avatar', name: 'avatar.png', status: 'done' }] as UploadFile[]) : []}
                >
                  <Button>上传头像</Button>
                </Upload>
              </Form.Item>
            </>
          )}
          <Form.Item
            name="phone"
            label="手机号"
            rules={[{ required: true }, { pattern: /^1\d{10}$/, message: '请输入 11 位手机号' }]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, min: 6 }]}>
            <Input.Password placeholder="请输入密码" />
          </Form.Item>
          <Button block type="primary" htmlType="submit">
            {mode === 'login' ? '登录' : '注册并登录'}
          </Button>
        </Form>
      </div>
    </div>
  );
}
