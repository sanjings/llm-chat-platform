import { ApiResponseCode, requestGet, requestPut } from '@/services/request';

export type UserDefaultModel = {
  defaultModelId: string | null;
  effectiveModelId: string;
};

const asDefaultModel = (data: UserDefaultModel | undefined): UserDefaultModel => ({
  defaultModelId:
    typeof data?.defaultModelId === 'string' && data.defaultModelId.trim() ? data.defaultModelId.trim() : null,
  effectiveModelId: typeof data?.effectiveModelId === 'string' ? data.effectiveModelId.trim() : ''
});

/** 当前登录用户已保存的个人默认模型，以及按当前部署可用性计算的生效值。 */
export const requestUserDefaultModel = async () => {
  const res = await requestGet<UserDefaultModel>('/api/user/default-model');
  if (res.code !== ApiResponseCode.SUCCESS) {
    throw new Error(res.message || '默认模型加载失败');
  }
  return asDefaultModel(res.data);
};

/** 将当前可用模型保存为个人默认；不可用模型应由调用方禁用，服务端仍会再次校验。 */
export const updateUserDefaultModel = async (defaultModelId: string) => {
  const res = await requestPut<UserDefaultModel>('/api/user/default-model', { defaultModelId });
  if (res.code !== ApiResponseCode.SUCCESS) {
    throw new Error(res.message || '默认模型保存失败');
  }
  return asDefaultModel(res.data);
};

export type UserProfile = {
  nickname: string;
  phone: string;
};

const asProfile = (data: UserProfile | undefined): UserProfile => ({
  nickname: typeof data?.nickname === 'string' ? data.nickname : '',
  phone: typeof data?.phone === 'string' ? data.phone : ''
});

/** 读取当前登录用户的账号资料，不按任意 userId 查询。 */
export const requestUserProfile = async () => {
  const res = await requestGet<UserProfile>('/api/user/profile');
  if (res.code !== ApiResponseCode.SUCCESS) {
    throw new Error(res.message || '账号资料加载失败');
  }
  return asProfile(res.data);
};

/** 更新当前登录用户的昵称；请求体只传 nickname，不传 userId 或手机号。 */
export const updateUserProfile = async (nickname: string) => {
  const res = await requestPut<UserProfile>('/api/user/profile', { nickname });
  if (res.code !== ApiResponseCode.SUCCESS) {
    throw new Error(res.message || '资料保存失败');
  }
  return asProfile(res.data);
};
