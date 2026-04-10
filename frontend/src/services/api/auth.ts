import { http } from '../request';

export interface AuthUser {
  id: string;
  phone: string;
  nickname: string;
  avatar?: string | null;
}

export interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export async function register(payload: { phone: string; password: string; nickname: string; avatar?: string }) {
  const { data } = await http.post<AuthResponse>('/auth/register', payload);
  return data;
}

export async function login(payload: { phone: string; password: string }) {
  const { data } = await http.post<AuthResponse>('/auth/login', payload);
  return data;
}

export async function getMe() {
  const { data } = await http.get<AuthUser>('/auth/me');
  return data;
}
