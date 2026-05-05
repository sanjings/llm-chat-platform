import axios from 'axios';
import { message } from 'antd';
import { safeStringify } from '@/utils';
import { useUserStore } from '@/store/user';
import type { AxiosInstance, AxiosResponse, AxiosRequestConfig, InternalAxiosRequestConfig, AxiosError } from 'axios';
import { type ApiResponseData } from 'types/api.d';
import { requestAuthRefresh } from '@/services/swagger/auth';

/**
 * 常量定义
 */
const REQUEST_TIMEOUT = 30 * 1000;
const FILE_DOWNLOAD_TIMEOUT = 60 * 1000;
const DEFAULT_FILE_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DEFAULT_ERROR_MESSAGE = '当前网络异常，请稍后重试';

export const HttpMethod = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  DELETE: 'DELETE'
} as const;

export type HttpMethod = (typeof HttpMethod)[keyof typeof HttpMethod];

export const ApiResponseCode = {
  SUCCESS: 200,
  FAIL: 500,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404
} as const;

/**
 * axios实例
 */
const axiosInstance: AxiosInstance = axios.create({
  timeout: REQUEST_TIMEOUT,
  withCredentials: true
});

/**
 * 正在进行的请求 Map
 * key: 请求唯一标识 (method + url + params)
 * value: AbortController
 */
export const pendingRequests = new Map<string, AbortController>();

/**
 * 生成请求的唯一标识
 */
const generateRequestKey = (config: InternalAxiosRequestConfig): string => {
  const { method, url, params, data } = config;
  const paramsStr = safeStringify(params);
  const dataStr = safeStringify(data);
  return `${method?.toUpperCase()}_${url}_${paramsStr}_${dataStr}`;
};

/**
 * 取消重复请求
 */
const cancelPendingRequest = (key: string) => {
  const controller = pendingRequests.get(key);
  if (controller) {
    controller.abort(`请求被取消: 检测到重复请求 ${key}`);
    pendingRequests.delete(key);
  }
};

/**
 * 从 pendingRequests 中移除请求
 */
const removePendingRequest = (requestKey?: string) => {
  if (requestKey) {
    pendingRequests.delete(requestKey);
  }
};

/**
 * 取消所有进行中的请求（仅在确定会话失效、即将退出登录时调用，勿在「首次 401 尝试 refresh」时调用，否则会打断仍可挽救的请求）
 */
const cancelAllPendingRequests = (reason = '请求被取消') => {
  pendingRequests.forEach((controller) => {
    controller.abort(reason);
  });
  pendingRequests.clear();
};

/** refresh 已失败或不应再刷新：中止其余未完成请求并登出 */
const logoutDueToExpiredSession = () => {
  cancelAllPendingRequests('登录已过期');
  message.error('登录已过期，请重新登录');
  useUserStore.getState().logout();
};

const refreshToken = async () => {
  const res = await requestAuthRefresh({ refreshToken: useUserStore.getState().refreshToken as string });
  if (res.code === ApiResponseCode.SUCCESS) {
    useUserStore.getState().setToken(res.data.accessToken);
    useUserStore.getState().setRefreshToken(res.data.refreshToken);
    return true;
  } else {
    return false;
  }
};

/** 并发 401 时共用一个 refresh，避免重复打 refresh 接口 */
let refreshPromise: Promise<boolean> | null = null;

const getOrCreateRefreshPromise = (): Promise<boolean> => {
  if (!refreshPromise) {
    refreshPromise = refreshToken().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

type RetryableInternalConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * 请求拦截器
 */
axiosInstance.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${useUserStore.getState().token}`;
    // 生成请求唯一标识
    const requestKey = generateRequestKey(config);

    // 如果存在相同的请求，取消之前的请求
    cancelPendingRequest(requestKey);

    // 为当前请求创建新的 AbortController
    const controller = new AbortController();
    config.signal = controller.signal;

    // 将当前请求添加到 pendingRequests
    pendingRequests.set(requestKey, controller);

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 防抖错误提示 timer
 */
let errorToastTimer: TimeoutHandle | null = null;
let pendingErrorMessage: string | null = null;

/**
 * 防抖错误提示：如果 300ms 内有多个错误，只显示最后一个
 */
const showErrorToast = (msg: string) => {
  pendingErrorMessage = msg;

  if (errorToastTimer) return;

  errorToastTimer = setTimeout(() => {
    if (pendingErrorMessage) {
      message.error(pendingErrorMessage);
    }
    errorToastTimer = null;
    pendingErrorMessage = null;
  }, 300);
};

/**
 * 统一的错误处理
 */
const handleError = (error: AxiosError | Error) => {
  // 如果是取消的请求，不显示错误信息（静默处理）
  if (axios.isCancel(error)) {
    return Promise.reject(error);
  }

  const errorMessage =
    axios.isAxiosError(error) && error.response?.data?.message ? error.response.data.message : DEFAULT_ERROR_MESSAGE;
  showErrorToast(errorMessage);
  return Promise.reject(error);
};

/**
 * 从 Content-Disposition 头中提取文件名
 */
const extractFileName = (disposition: string): string => {
  const fileNameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
  if (fileNameMatch && fileNameMatch[1]) {
    let fileName = fileNameMatch[1].replace(/['"]/g, '');
    // 处理 URL 编码的文件名
    if (fileName.startsWith("UTF-8''") || fileName.startsWith("UTF-8''")) {
      fileName = fileName.substring(7);
    }
    return decodeURIComponent(fileName);
  }
  return 'download';
};

/**
 * 响应拦截处理
 */
axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    const { data, config, headers } = response;

    // 请求完成，从 pendingRequests 中移除（重新生成 key）
    const requestKey = generateRequestKey(config);
    removePendingRequest(requestKey);

    // 处理文件下载响应
    if (config.responseType === 'blob' || config.responseType === 'arraybuffer') {
      const disposition = headers['content-disposition'];
      if (disposition) {
        return {
          data,
          fileName: extractFileName(disposition)
        };
      }
      return data;
    }

    // 处理普通响应
    const resData = data || {};
    resData.code = Number(resData.code);

    if (resData.code === ApiResponseCode.UNAUTHORIZED) {
      const originalConfig = config as RetryableInternalConfig;

      // refresh 本身失败或已重试仍 401：不再刷新，直接退出登录
      if (originalConfig._retry || originalConfig.url?.includes(requestAuthRefresh.requestConfig.path)) {
        logoutDueToExpiredSession();
        return Promise.reject(resData);
      }

      originalConfig._retry = true;

      return getOrCreateRefreshPromise().then(
        (ok) => {
          if (!ok) {
            logoutDueToExpiredSession();
            return Promise.reject(resData);
          }
          // 请求拦截器会从 store 读取新 token
          return axiosInstance(originalConfig);
        },
        () => {
          logoutDueToExpiredSession();
          return Promise.reject(resData);
        }
      );
    }

    return resData;
  },
  (error: AxiosError) => {
    // 请求失败，从 pendingRequests 中移除（重新生成 key）
    if (error.config) {
      const requestKey = generateRequestKey(error.config);
      removePendingRequest(requestKey);
    }
    return handleError(error);
  }
);

const requestGet = <T = unknown>(
  url: string,
  params?: Recordable,
  config?: AxiosRequestConfig
): Promise<ApiResponseData<T>> => axiosInstance.get(url, { params, ...config });

const requestPost = <T = unknown>(
  url: string,
  params?: Recordable,
  config?: AxiosRequestConfig
): Promise<ApiResponseData<T>> => axiosInstance.post(url, params, config);

const requestPut = <T = unknown>(
  url: string,
  params?: Recordable,
  config?: AxiosRequestConfig
): Promise<ApiResponseData<T>> => axiosInstance.put(url, params, config);

const requestDelete = <T = unknown>(url: string, params?: Recordable): Promise<ApiResponseData<T>> =>
  axiosInstance.delete(url, params);

interface DownloadResponse extends AxiosResponse {
  fileName?: string;
}

/**
 * 下载文件
 * @param url 文件url
 * @param params 入参
 * @param method 请求方法
 * @param fileType 文件类型
 */
const requestDownFile = async <T extends Recordable>(
  url: string,
  params: T,
  method: HttpMethod = HttpMethod.POST,
  fileType = DEFAULT_FILE_TYPE
): Promise<Blob> => {
  try {
    const response = (await axiosInstance({
      method,
      url,
      [method === HttpMethod.POST ? 'data' : 'params']: params,
      responseType: 'blob',
      timeout: FILE_DOWNLOAD_TIMEOUT
    })) as DownloadResponse;

    const { data, fileName } = response;

    if (!(data instanceof Blob)) {
      throw new Error('下载出现异常,请联系开发人员！');
    }

    const blob = new Blob([data], { type: `${fileType};charset=utf-8` });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = fileName || 'download';
    link.click();
    window.URL.revokeObjectURL(link.href);
    link.remove();

    return data;
  } catch (error) {
    // handleError 会显示错误消息并 reject，直接返回即可
    return handleError(error as AxiosError | Error) as Promise<Blob>;
  }
};

export { requestGet, requestPost, requestPut, requestDelete, requestDownFile };

export default axiosInstance;
