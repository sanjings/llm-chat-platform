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
