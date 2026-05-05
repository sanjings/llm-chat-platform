import http from './request';
import type { RequestFunctionParams } from 'yapi-to-typescript';
import type { AxiosRequestConfig } from 'axios';
import type { ApiResponseData } from 'types/api';

export default async function request<T = unknown>(
  { method, path, data }: RequestFunctionParams,
  options?: AxiosRequestConfig
): Promise<ApiResponseData<T>> {
  return http({
    url: path,
    method: method.toLowerCase(),
    data,
    ...options
  });
}
