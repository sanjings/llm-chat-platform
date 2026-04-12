import { http } from '../request';

export interface AuthUser {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  userInfo: AuthUser;
}

export async function registerLogin(payload: { phone: string; password: string; nickname: string; avatar?: string }) {
  const { data } = await http.post<AuthResponse>('/auth/registerLogin', payload);
  return data;
}

export async function login(payload: { phone: string; password: string }) {
  const { data } = await http.post<AuthResponse>('/auth/login', payload);
  return data;
}
