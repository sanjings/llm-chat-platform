import type { User } from 'types/user';
import { requestPost } from '../request';

export interface AuthResponse {
  accessToken: string;
  userInfo: User;
}

export async function requestRegisterAndLogin(payload: {
  phone: string;
  password: string;
  nickname: string;
  avatar?: string;
}) {
  return await requestPost<AuthResponse>('/auth/registerLogin', payload);
}

export async function requestLogin(payload: { phone: string; password: string }) {
  return await requestPost<AuthResponse>('/auth/login', payload);
}
