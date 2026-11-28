import { ApiResponseCode, requestGet, requestPost, requestPut } from '@/services/request';

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

export type ChangePasswordPayload = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

/** 修改当前登录用户的密码；请求体只传三个密码字段，不传 userId。成功后当前会话保持登录。 */
export const updateCurrentUserPassword = async (payload: ChangePasswordPayload) => {
  const res = await requestPut('/api/auth/password', {
    currentPassword: payload.currentPassword,
    newPassword: payload.newPassword,
    confirmNewPassword: payload.confirmNewPassword
  });
  if (res.code !== ApiResponseCode.SUCCESS) {
    throw new Error(res.message || '密码修改失败');
  }
};

/** 调用已有的退出全部设备接口，成功后全部会话立即失效（含当前设备）。 */
export const requestLogoutAllDevices = async () => {
  const res = await requestPost('/api/auth/logoutAll');
  if (res.code !== ApiResponseCode.SUCCESS) {
    throw new Error(res.message || '退出全部设备失败');
  }
};
