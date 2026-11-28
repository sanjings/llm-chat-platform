export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 32;

/** 与注册/登录规则对齐：必填，长度 6～32。不额外做去空格或字符集限制。 */
export const validatePassword = (value: string) => {
  if (typeof value !== 'string' || value.length === 0) return '密码不能为空';
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return `请输入${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH}位密码`;
  }
  return null;
};
