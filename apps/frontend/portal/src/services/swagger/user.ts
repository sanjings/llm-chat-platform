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

const mockUrl_0_0_0_1 = 'http://127.0.0.1:50505/mock/0' as any
const devUrl_0_0_0_1 = '' as any
const prodUrl_0_0_0_1 = '' as any
const dataKey_0_0_0_1 = undefined as any

/**
 * 接口 用户列表（分页，无敏感字段；后续可加管理端权限） 的 **请求类型**
 *
 * @分类 user
 * @请求头 `GET /api/user/list`
 */
export interface RequestUserListRequest {
  /**
   * 每页数量
   */
  pageSize?: string
  /**
   * 页码，从 1 开始
   */
  pageNo?: string
}

/**
 * 接口 用户列表（分页，无敏感字段；后续可加管理端权限） 的 **返回类型**
 *
 * @分类 user
 * @请求头 `GET /api/user/list`
 */
export interface RequestUserListResponse {
  total: number
  pageNo: number
  pageSize: number
  list: {
    id: string
    phone: string
    email?: {}
    nickname: string
    avatar?: string
    createTime: string
    updateTime: string
  }[]
}

/**
 * 接口 用户列表（分页，无敏感字段；后续可加管理端权限） 的 **请求配置的类型**
 *
 * @分类 user
 * @请求头 `GET /api/user/list`
 */
type RequestUserListRequestConfig = Readonly<
  RequestConfig<
    'http://127.0.0.1:50505/mock/0',
    '',
    '',
    '/api/user/list',
    undefined,
    string,
    'pageSize' | 'pageNo',
    false
  >
>

/**
 * 接口 用户列表（分页，无敏感字段；后续可加管理端权限） 的 **请求配置**
 *
 * @分类 user
 * @请求头 `GET /api/user/list`
 */
const requestUserListRequestConfig: RequestUserListRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_1,
  devUrl: devUrl_0_0_0_1,
  prodUrl: prodUrl_0_0_0_1,
  path: '/api/user/list',
  method: Method.GET,
  requestHeaders: {},
  requestBodyType: RequestBodyType.query,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_1,
  paramNames: [],
  queryNames: ['pageSize', 'pageNo'],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestUserList',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 用户列表（分页，无敏感字段；后续可加管理端权限） 的 **请求函数**
 *
 * @分类 user
 * @请求头 `GET /api/user/list`
 */
export const requestUserList = /*#__PURE__*/ (requestData: RequestUserListRequest, ...args: UserRequestRestArgs) => {
  return request<RequestUserListResponse>(prepare(requestUserListRequestConfig, requestData), ...args)
}

requestUserList.requestConfig = requestUserListRequestConfig

/**
 * 接口 按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展） 的 **请求类型**
 *
 * @分类 user
 * @请求头 `GET /api/user/info`
 */
export interface RequestUserInfoRequest {
  /**
   * 用户 id（UUID），后台管理可按需查询任意用户
   */
  userId: string
}

/**
 * 接口 按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展） 的 **返回类型**
 *
 * @分类 user
 * @请求头 `GET /api/user/info`
 */
export interface RequestUserInfoResponse {
  id: string
  phone: string
  email?: {}
  nickname: string
  avatar?: string
  createTime: string
  updateTime: string
}

/**
 * 接口 按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展） 的 **请求配置的类型**
 *
 * @分类 user
 * @请求头 `GET /api/user/info`
 */
type RequestUserInfoRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/user/info', undefined, string, 'userId', false>
>

/**
 * 接口 按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展） 的 **请求配置**
 *
 * @分类 user
 * @请求头 `GET /api/user/info`
 */
const requestUserInfoRequestConfig: RequestUserInfoRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_1,
  devUrl: devUrl_0_0_0_1,
  prodUrl: prodUrl_0_0_0_1,
  path: '/api/user/info',
  method: Method.GET,
  requestHeaders: {},
  requestBodyType: RequestBodyType.query,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_1,
  paramNames: [],
  queryNames: ['userId'],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestUserInfo',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 按 userId 查询用户资料（非仅当前登录人，便于后台管理扩展） 的 **请求函数**
 *
 * @分类 user
 * @请求头 `GET /api/user/info`
 */
export const requestUserInfo = /*#__PURE__*/ (requestData: RequestUserInfoRequest, ...args: UserRequestRestArgs) => {
  return request<RequestUserInfoResponse>(prepare(requestUserInfoRequestConfig, requestData), ...args)
}

requestUserInfo.requestConfig = requestUserInfoRequestConfig

/* prettier-ignore-end */
