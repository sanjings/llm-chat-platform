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
   * JWT 访问令牌
   */
  accessToken: string
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
   * JWT 访问令牌
   */
  accessToken: string
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

/* prettier-ignore-end */
