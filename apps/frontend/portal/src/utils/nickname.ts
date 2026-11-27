export const NICKNAME_MIN_LENGTH = 2;
export const NICKNAME_MAX_LENGTH = 20;

/** 与注册服务端规则对齐：必填，长度 2～20。不额外做去空格或字符集限制。 */
export const validateNickname = (value: string) => {
  if (typeof value !== 'string' || value.length === 0) return '昵称不能为空';
  if (value.length < NICKNAME_MIN_LENGTH) return `昵称至少 ${NICKNAME_MIN_LENGTH} 个字符`;
  if (value.length > NICKNAME_MAX_LENGTH) return `昵称最多 ${NICKNAME_MAX_LENGTH} 个字符`;
  return null;
};
