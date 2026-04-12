import axios from 'axios';

export const TOKEN_KEY = 'access_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export const http = axios.create({
  baseURL: '/api',
  timeout: 30000
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (response) => {
    console.log(response.data);
    return response.data;
  },
  (error) => {
    const msg = error?.response?.data?.message || error?.message || '请求失败';
    return Promise.reject(new Error(msg));
  }
);

export async function request<T>(config: {
  path: string;
  method: string;
  params?: unknown;
  data?: unknown;
  headers?: Record<string, string>;
}) {
  const { data } = await http.request<T>({
    url: config.path,
    method: config.method as 'GET' | 'POST' | 'PATCH' | 'DELETE',
    params: config.params,
    data: config.data,
    headers: config.headers
  });
  return data;
}

export default request;
