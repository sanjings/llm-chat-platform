import http from './request';
import type { RequestFunctionParams } from 'yapi-to-typescript';
import type { AxiosRequestConfig } from 'axios';
import type { ApiResponseData } from 'types/api';

const { VITE_HTTP_BASE_URL } = import.meta.env;

export default async function request<T = unknown>(
  { method, path, data }: RequestFunctionParams,
  options?: AxiosRequestConfig
): Promise<ApiResponseData<T>> {
  return http({
    url: `${VITE_HTTP_BASE_URL}${path}`,
    method: method.toLowerCase(),
    data,
    ...options
  });
}
