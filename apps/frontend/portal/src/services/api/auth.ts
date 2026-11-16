import { ApiResponseCode, requestGet } from '@/services/request';

export type AuthPublicConfig = {
  registrationEnabled: boolean;
};

/** 登录页公开配置。是否开放注册由服务端按部署环境返回。 */
export const requestAuthConfig = async () => {
  const res = await requestGet<AuthPublicConfig>('/api/auth/config');
  if (res.code !== ApiResponseCode.SUCCESS || typeof res.data?.registrationEnabled !== 'boolean') {
    throw new Error(res.message || '登录配置加载失败');
  }
  return res.data;
};
