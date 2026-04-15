export const LoginMode = {
  LOGIN: 'login',
  REGISTER: 'register'
} as const;

export type LoginMode = (typeof LoginMode)[keyof typeof LoginMode];
