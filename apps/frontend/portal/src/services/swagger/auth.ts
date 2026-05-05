/* prettier-ignore-start */
/* tslint:disable */
/* eslint-disable */

/* 该文件由 yapi-to-typescript 自动生成，请勿直接修改！！！ */

// @ts-ignore
// prettier-ignore
import { QueryStringArrayFormat, Method, RequestBodyType, ResponseBodyType, FileData, prepare } from 'yapi-to-typescript'
// @ts-ignore
// prettier-ignore
import type { RequestConfig, RequestFunctionRestArgs } from 'yapi-to-typescript'
// @ts-ignore
import request from '../ytt-request'

type UserRequestRestArgs = RequestFunctionRestArgs<typeof request>

// Request: 目前 React Hooks 功能有用到
export type Request<
  TRequestData,
  TRequestConfig extends RequestConfig,
  TRequestResult,
> = (TRequestConfig['requestDataOptional'] extends true
  ? (requestData?: TRequestData, ...args: RequestFunctionRestArgs<typeof request>) => TRequestResult
  : (requestData: TRequestData, ...args: RequestFunctionRestArgs<typeof request>) => TRequestResult) & {
  requestConfig: TRequestConfig
}

const mockUrl_0_0_0_0 = 'http://127.0.0.1:50505/mock/0' as any
const devUrl_0_0_0_0 = '' as any
const prodUrl_0_0_0_0 = '' as any
const dataKey_0_0_0_0 = undefined as any

/**
 * 接口 手机号注册 的 **请求类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/register`
 */
export interface RequestAuthRegisterRequest {
  phone: string
  password: string
  nickname: string
  /**
   * 头像地址或 base64 字符串
   */
  avatar?: string
}

/**
 * 接口 手机号注册 的 **返回类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/register`
 */
export interface RequestAuthRegisterResponse {}

/**
 * 接口 手机号注册 的 **请求配置的类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/register`
 */
type RequestAuthRegisterRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/auth/register', undefined, string, string, false>
>

/**
 * 接口 手机号注册 的 **请求配置**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/register`
 */
const requestAuthRegisterRequestConfig: RequestAuthRegisterRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_0,
  devUrl: devUrl_0_0_0_0,
  prodUrl: prodUrl_0_0_0_0,
  path: '/api/auth/register',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.json,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_0,
  paramNames: [],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestAuthRegister',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 手机号注册 的 **请求函数**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/register`
 */
export const requestAuthRegister = /*#__PURE__*/ (
  requestData: RequestAuthRegisterRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestAuthRegisterResponse>(prepare(requestAuthRegisterRequestConfig, requestData), ...args)
}

requestAuthRegister.requestConfig = requestAuthRegisterRequestConfig

/**
 * 接口 手机号注册并登录 的 **请求类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/registerLogin`
 */
export interface RequestAuthRegisterLoginRequest {
  phone: string
  password: string
  nickname: string
  /**
   * 头像地址或 base64 字符串
   */
  avatar?: string
}

/**
 * 接口 手机号注册并登录 的 **返回类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/registerLogin`
 */
export interface RequestAuthRegisterLoginResponse {
  /**
   * JWT 访问令牌（短有效期）
   */
  accessToken: string
  /**
   * JWT 刷新令牌（用于换发 accessToken）
   */
  refreshToken: string
  /**
   * accessToken 过期时间（秒）
   */
  accessTokenExpiresIn: number
  /**
   * refreshToken 过期时间（秒）
   */
  refreshTokenExpiresIn: number
  userInfo: {
    id: string
    phone: string
    nickname: string
    /**
     * 头像地址或 base64 字符串
     */
    avatar?: string
  }
}

/**
 * 接口 手机号注册并登录 的 **请求配置的类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/registerLogin`
 */
type RequestAuthRegisterLoginRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/auth/registerLogin', undefined, string, string, false>
>

/**
 * 接口 手机号注册并登录 的 **请求配置**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/registerLogin`
 */
const requestAuthRegisterLoginRequestConfig: RequestAuthRegisterLoginRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_0,
  devUrl: devUrl_0_0_0_0,
  prodUrl: prodUrl_0_0_0_0,
  path: '/api/auth/registerLogin',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.json,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_0,
  paramNames: [],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestAuthRegisterLogin',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 手机号注册并登录 的 **请求函数**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/registerLogin`
 */
export const requestAuthRegisterLogin = /*#__PURE__*/ (
  requestData: RequestAuthRegisterLoginRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestAuthRegisterLoginResponse>(prepare(requestAuthRegisterLoginRequestConfig, requestData), ...args)
}

requestAuthRegisterLogin.requestConfig = requestAuthRegisterLoginRequestConfig

/**
 * 接口 手机号登录 的 **请求类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/login`
 */
export interface RequestAuthLoginRequest {
  phone: string
  password: string
}

/**
 * 接口 手机号登录 的 **返回类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/login`
 */
export interface RequestAuthLoginResponse {
  /**
   * JWT 访问令牌（短有效期）
   */
  accessToken: string
  /**
   * JWT 刷新令牌（用于换发 accessToken）
   */
  refreshToken: string
  /**
   * accessToken 过期时间（秒）
   */
  accessTokenExpiresIn: number
  /**
   * refreshToken 过期时间（秒）
   */
  refreshTokenExpiresIn: number
  userInfo: {
    id: string
    phone: string
    nickname: string
    /**
     * 头像地址或 base64 字符串
     */
    avatar?: string
  }
}

/**
 * 接口 手机号登录 的 **请求配置的类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/login`
 */
type RequestAuthLoginRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/auth/login', undefined, string, string, false>
>

/**
 * 接口 手机号登录 的 **请求配置**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/login`
 */
const requestAuthLoginRequestConfig: RequestAuthLoginRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_0,
  devUrl: devUrl_0_0_0_0,
  prodUrl: prodUrl_0_0_0_0,
  path: '/api/auth/login',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.json,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_0,
  paramNames: [],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestAuthLogin',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 手机号登录 的 **请求函数**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/login`
 */
export const requestAuthLogin = /*#__PURE__*/ (requestData: RequestAuthLoginRequest, ...args: UserRequestRestArgs) => {
  return request<RequestAuthLoginResponse>(prepare(requestAuthLoginRequestConfig, requestData), ...args)
}

requestAuthLogin.requestConfig = requestAuthLoginRequestConfig

/**
 * 接口 刷新令牌并换发 accessToken 的 **请求类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/refresh`
 */
export interface RequestAuthRefreshRequest {
  /**
   * 刷新令牌
   */
  refreshToken: string
}

/**
 * 接口 刷新令牌并换发 accessToken 的 **返回类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/refresh`
 */
export interface RequestAuthRefreshResponse {
  /**
   * JWT 访问令牌（短有效期）
   */
  accessToken: string
  /**
   * JWT 刷新令牌（用于换发 accessToken）
   */
  refreshToken: string
  /**
   * accessToken 过期时间（秒）
   */
  accessTokenExpiresIn: number
  /**
   * refreshToken 过期时间（秒）
   */
  refreshTokenExpiresIn: number
  userInfo: {
    id: string
    phone: string
    nickname: string
    /**
     * 头像地址或 base64 字符串
     */
    avatar?: string
  }
}

/**
 * 接口 刷新令牌并换发 accessToken 的 **请求配置的类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/refresh`
 */
type RequestAuthRefreshRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/auth/refresh', undefined, string, string, false>
>

/**
 * 接口 刷新令牌并换发 accessToken 的 **请求配置**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/refresh`
 */
const requestAuthRefreshRequestConfig: RequestAuthRefreshRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_0,
  devUrl: devUrl_0_0_0_0,
  prodUrl: prodUrl_0_0_0_0,
  path: '/api/auth/refresh',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.json,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_0,
  paramNames: [],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestAuthRefresh',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 刷新令牌并换发 accessToken 的 **请求函数**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/refresh`
 */
export const requestAuthRefresh = /*#__PURE__*/ (
  requestData: RequestAuthRefreshRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestAuthRefreshResponse>(prepare(requestAuthRefreshRequestConfig, requestData), ...args)
}

requestAuthRefresh.requestConfig = requestAuthRefreshRequestConfig

/**
 * 接口 退出当前设备 的 **请求类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logout`
 */
export interface RequestAuthLogoutRequest {}

/**
 * 接口 退出当前设备 的 **返回类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logout`
 */
export interface RequestAuthLogoutResponse {}

/**
 * 接口 退出当前设备 的 **请求配置的类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logout`
 */
type RequestAuthLogoutRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/auth/logout', undefined, string, string, true>
>

/**
 * 接口 退出当前设备 的 **请求配置**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logout`
 */
const requestAuthLogoutRequestConfig: RequestAuthLogoutRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_0,
  devUrl: devUrl_0_0_0_0,
  prodUrl: prodUrl_0_0_0_0,
  path: '/api/auth/logout',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.raw,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_0,
  paramNames: [],
  queryNames: [],
  requestDataOptional: true,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestAuthLogout',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 退出当前设备 的 **请求函数**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logout`
 */
export const requestAuthLogout = /*#__PURE__*/ (
  requestData?: RequestAuthLogoutRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestAuthLogoutResponse>(prepare(requestAuthLogoutRequestConfig, requestData), ...args)
}

requestAuthLogout.requestConfig = requestAuthLogoutRequestConfig

/**
 * 接口 退出全部设备 的 **请求类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logoutAll`
 */
export interface RequestAuthLogoutAllRequest {}

/**
 * 接口 退出全部设备 的 **返回类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logoutAll`
 */
export interface RequestAuthLogoutAllResponse {}

/**
 * 接口 退出全部设备 的 **请求配置的类型**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logoutAll`
 */
type RequestAuthLogoutAllRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/auth/logoutAll', undefined, string, string, true>
>

/**
 * 接口 退出全部设备 的 **请求配置**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logoutAll`
 */
const requestAuthLogoutAllRequestConfig: RequestAuthLogoutAllRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_0,
  devUrl: devUrl_0_0_0_0,
  prodUrl: prodUrl_0_0_0_0,
  path: '/api/auth/logoutAll',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.raw,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_0,
  paramNames: [],
  queryNames: [],
  requestDataOptional: true,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestAuthLogoutAll',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 退出全部设备 的 **请求函数**
 *
 * @分类 auth
 * @请求头 `POST /api/auth/logoutAll`
 */
export const requestAuthLogoutAll = /*#__PURE__*/ (
  requestData?: RequestAuthLogoutAllRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestAuthLogoutAllResponse>(prepare(requestAuthLogoutAllRequestConfig, requestData), ...args)
}

requestAuthLogoutAll.requestConfig = requestAuthLogoutAllRequestConfig

/* prettier-ignore-end */
