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

const mockUrl_0_0_0_2 = 'http://127.0.0.1:50505/mock/0' as any
const devUrl_0_0_0_2 = '' as any
const prodUrl_0_0_0_2 = '' as any
const dataKey_0_0_0_2 = undefined as any

/**
 * 接口 获取当前用户会话列表（分页） 的 **请求类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/list`
 */
export interface RequestSessionListRequest {
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
 * 接口 获取当前用户会话列表（分页） 的 **返回类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/list`
 */
export interface RequestSessionListResponse {
  total: number
  pageNo: number
  pageSize: number
  list: {
    id: string
    title: string
    createTime: string
    updateTime: string
  }[]
}

/**
 * 接口 获取当前用户会话列表（分页） 的 **请求配置的类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/list`
 */
type RequestSessionListRequestConfig = Readonly<
  RequestConfig<
    'http://127.0.0.1:50505/mock/0',
    '',
    '',
    '/api/session/list',
    undefined,
    string,
    'pageSize' | 'pageNo',
    false
  >
>

/**
 * 接口 获取当前用户会话列表（分页） 的 **请求配置**
 *
 * @分类 session
 * @请求头 `GET /api/session/list`
 */
const requestSessionListRequestConfig: RequestSessionListRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_2,
  devUrl: devUrl_0_0_0_2,
  prodUrl: prodUrl_0_0_0_2,
  path: '/api/session/list',
  method: Method.GET,
  requestHeaders: {},
  requestBodyType: RequestBodyType.query,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_2,
  paramNames: [],
  queryNames: ['pageSize', 'pageNo'],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestSessionList',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 获取当前用户会话列表（分页） 的 **请求函数**
 *
 * @分类 session
 * @请求头 `GET /api/session/list`
 */
export const requestSessionList = /*#__PURE__*/ (
  requestData: RequestSessionListRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestSessionListResponse>(prepare(requestSessionListRequestConfig, requestData), ...args)
}

requestSessionList.requestConfig = requestSessionListRequestConfig

/**
 * 接口 会话消息（cursor 分页，从新到旧向更早翻页） 的 **请求类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/messages/{sessionId}`
 */
export interface RequestSessionMessagesSessionIdRequest {
  /**
   * 每页数量
   */
  pageSize?: string
  /**
   * 游标，表示上一页最旧消息位置
   */
  cursor?: string
  sessionId: string
}

/**
 * 接口 会话消息（cursor 分页，从新到旧向更早翻页） 的 **返回类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/messages/{sessionId}`
 */
export interface RequestSessionMessagesSessionIdResponse {
  list: {
    id: number
    sessionId: string
    role: 'user' | 'assistant' | 'system'
    content: string
    createTime: string
  }[]
  nextCursor?: {}
  hasMore: boolean
  pageSize: number
}

/**
 * 接口 会话消息（cursor 分页，从新到旧向更早翻页） 的 **请求配置的类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/messages/{sessionId}`
 */
type RequestSessionMessagesSessionIdRequestConfig = Readonly<
  RequestConfig<
    'http://127.0.0.1:50505/mock/0',
    '',
    '',
    '/api/session/messages/{sessionId}',
    undefined,
    'sessionId',
    'pageSize' | 'cursor',
    false
  >
>

/**
 * 接口 会话消息（cursor 分页，从新到旧向更早翻页） 的 **请求配置**
 *
 * @分类 session
 * @请求头 `GET /api/session/messages/{sessionId}`
 */
const requestSessionMessagesSessionIdRequestConfig: RequestSessionMessagesSessionIdRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_2,
  devUrl: devUrl_0_0_0_2,
  prodUrl: prodUrl_0_0_0_2,
  path: '/api/session/messages/{sessionId}',
  method: Method.GET,
  requestHeaders: {},
  requestBodyType: RequestBodyType.query,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_2,
  paramNames: ['sessionId'],
  queryNames: ['pageSize', 'cursor'],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestSessionMessagesSessionId',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 会话消息（cursor 分页，从新到旧向更早翻页） 的 **请求函数**
 *
 * @分类 session
 * @请求头 `GET /api/session/messages/{sessionId}`
 */
export const requestSessionMessagesSessionId = /*#__PURE__*/ (
  requestData: RequestSessionMessagesSessionIdRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestSessionMessagesSessionIdResponse>(
    prepare(requestSessionMessagesSessionIdRequestConfig, requestData),
    ...args,
  )
}

requestSessionMessagesSessionId.requestConfig = requestSessionMessagesSessionIdRequestConfig

/**
 * 接口 获取会话详情（不含消息，消息请用 session\/messages\/:sessionId） 的 **请求类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/detail/{id}`
 */
export interface RequestSessionDetailIdRequest {
  id: string
}

/**
 * 接口 获取会话详情（不含消息，消息请用 session\/messages\/:sessionId） 的 **返回类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/detail/{id}`
 */
export interface RequestSessionDetailIdResponse {
  id: string
  title: string
  createTime: string
  updateTime: string
  userId: string
}

/**
 * 接口 获取会话详情（不含消息，消息请用 session\/messages\/:sessionId） 的 **请求配置的类型**
 *
 * @分类 session
 * @请求头 `GET /api/session/detail/{id}`
 */
type RequestSessionDetailIdRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/session/detail/{id}', undefined, 'id', string, false>
>

/**
 * 接口 获取会话详情（不含消息，消息请用 session\/messages\/:sessionId） 的 **请求配置**
 *
 * @分类 session
 * @请求头 `GET /api/session/detail/{id}`
 */
const requestSessionDetailIdRequestConfig: RequestSessionDetailIdRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_2,
  devUrl: devUrl_0_0_0_2,
  prodUrl: prodUrl_0_0_0_2,
  path: '/api/session/detail/{id}',
  method: Method.GET,
  requestHeaders: {},
  requestBodyType: RequestBodyType.query,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_2,
  paramNames: ['id'],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestSessionDetailId',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 获取会话详情（不含消息，消息请用 session\/messages\/:sessionId） 的 **请求函数**
 *
 * @分类 session
 * @请求头 `GET /api/session/detail/{id}`
 */
export const requestSessionDetailId = /*#__PURE__*/ (
  requestData: RequestSessionDetailIdRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestSessionDetailIdResponse>(prepare(requestSessionDetailIdRequestConfig, requestData), ...args)
}

requestSessionDetailId.requestConfig = requestSessionDetailIdRequestConfig

/**
 * 接口 创建会话 的 **请求类型**
 *
 * @分类 session
 * @请求头 `POST /api/session/create`
 */
export interface RequestSessionCreateRequest {}

/**
 * 接口 创建会话 的 **返回类型**
 *
 * @分类 session
 * @请求头 `POST /api/session/create`
 */
export interface RequestSessionCreateResponse {
  id: string
  title: string
  createTime: string
  updateTime: string
}

/**
 * 接口 创建会话 的 **请求配置的类型**
 *
 * @分类 session
 * @请求头 `POST /api/session/create`
 */
type RequestSessionCreateRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/session/create', undefined, string, string, true>
>

/**
 * 接口 创建会话 的 **请求配置**
 *
 * @分类 session
 * @请求头 `POST /api/session/create`
 */
const requestSessionCreateRequestConfig: RequestSessionCreateRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_2,
  devUrl: devUrl_0_0_0_2,
  prodUrl: prodUrl_0_0_0_2,
  path: '/api/session/create',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.raw,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_2,
  paramNames: [],
  queryNames: [],
  requestDataOptional: true,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestSessionCreate',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 创建会话 的 **请求函数**
 *
 * @分类 session
 * @请求头 `POST /api/session/create`
 */
export const requestSessionCreate = /*#__PURE__*/ (
  requestData?: RequestSessionCreateRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestSessionCreateResponse>(prepare(requestSessionCreateRequestConfig, requestData), ...args)
}

requestSessionCreate.requestConfig = requestSessionCreateRequestConfig

/**
 * 接口 更新会话标题 的 **请求类型**
 *
 * @分类 session
 * @请求头 `POST /api/session/title/update`
 */
export interface RequestSessionTitleUpdateRequest {
  id?: string
  title?: string
}

/**
 * 接口 更新会话标题 的 **返回类型**
 *
 * @分类 session
 * @请求头 `POST /api/session/title/update`
 */
export interface RequestSessionTitleUpdateResponse {
  id: string
  title: string
  createTime: string
  updateTime: string
}

/**
 * 接口 更新会话标题 的 **请求配置的类型**
 *
 * @分类 session
 * @请求头 `POST /api/session/title/update`
 */
type RequestSessionTitleUpdateRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/session/title/update', undefined, string, string, false>
>

/**
 * 接口 更新会话标题 的 **请求配置**
 *
 * @分类 session
 * @请求头 `POST /api/session/title/update`
 */
const requestSessionTitleUpdateRequestConfig: RequestSessionTitleUpdateRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_2,
  devUrl: devUrl_0_0_0_2,
  prodUrl: prodUrl_0_0_0_2,
  path: '/api/session/title/update',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.json,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_2,
  paramNames: [],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestSessionTitleUpdate',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 更新会话标题 的 **请求函数**
 *
 * @分类 session
 * @请求头 `POST /api/session/title/update`
 */
export const requestSessionTitleUpdate = /*#__PURE__*/ (
  requestData: RequestSessionTitleUpdateRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestSessionTitleUpdateResponse>(
    prepare(requestSessionTitleUpdateRequestConfig, requestData),
    ...args,
  )
}

requestSessionTitleUpdate.requestConfig = requestSessionTitleUpdateRequestConfig

/**
 * 接口 删除会话 的 **请求类型**
 *
 * @分类 session
 * @请求头 `DELETE /api/session/delete/{id}`
 */
export interface RequestSessionDeleteIdRequest {
  id: string
}

/**
 * 接口 删除会话 的 **返回类型**
 *
 * @分类 session
 * @请求头 `DELETE /api/session/delete/{id}`
 */
export interface RequestSessionDeleteIdResponse {
  id: string
  title: string
  createTime: string
  updateTime: string
}

/**
 * 接口 删除会话 的 **请求配置的类型**
 *
 * @分类 session
 * @请求头 `DELETE /api/session/delete/{id}`
 */
type RequestSessionDeleteIdRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/session/delete/{id}', undefined, 'id', string, false>
>

/**
 * 接口 删除会话 的 **请求配置**
 *
 * @分类 session
 * @请求头 `DELETE /api/session/delete/{id}`
 */
const requestSessionDeleteIdRequestConfig: RequestSessionDeleteIdRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_2,
  devUrl: devUrl_0_0_0_2,
  prodUrl: prodUrl_0_0_0_2,
  path: '/api/session/delete/{id}',
  method: Method.DELETE,
  requestHeaders: {},
  requestBodyType: RequestBodyType.raw,
  responseBodyType: ResponseBodyType.json,
  dataKey: dataKey_0_0_0_2,
  paramNames: ['id'],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestSessionDeleteId',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 删除会话 的 **请求函数**
 *
 * @分类 session
 * @请求头 `DELETE /api/session/delete/{id}`
 */
export const requestSessionDeleteId = /*#__PURE__*/ (
  requestData: RequestSessionDeleteIdRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestSessionDeleteIdResponse>(prepare(requestSessionDeleteIdRequestConfig, requestData), ...args)
}

requestSessionDeleteId.requestConfig = requestSessionDeleteIdRequestConfig

/* prettier-ignore-end */
