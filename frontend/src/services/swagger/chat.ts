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

const mockUrl_0_0_0_3 = 'http://127.0.0.1:50505/mock/0' as any
const devUrl_0_0_0_3 = '' as any
const prodUrl_0_0_0_3 = '' as any
const dataKey_0_0_0_3 = undefined as any

/**
 * 接口 流式聊天 的 **请求类型**
 *
 * @分类 chat
 * @请求头 `POST /api/chat/stream`
 */
export interface RequestChatStreamRequest {
  messages: {
    role: 'user' | 'assistant' | 'system'
    content: string
  }[]
  sessionId?: string
  modelId?: string
  responseFormat?: 'text' | 'markdown'
}

/**
 * 接口 流式聊天 的 **返回类型**
 *
 * @分类 chat
 * @请求头 `POST /api/chat/stream`
 */
export type RequestChatStreamResponse = any

/**
 * 接口 流式聊天 的 **请求配置的类型**
 *
 * @分类 chat
 * @请求头 `POST /api/chat/stream`
 */
type RequestChatStreamRequestConfig = Readonly<
  RequestConfig<'http://127.0.0.1:50505/mock/0', '', '', '/api/chat/stream', undefined, string, string, false>
>

/**
 * 接口 流式聊天 的 **请求配置**
 *
 * @分类 chat
 * @请求头 `POST /api/chat/stream`
 */
const requestChatStreamRequestConfig: RequestChatStreamRequestConfig = /*#__PURE__*/ {
  mockUrl: mockUrl_0_0_0_3,
  devUrl: devUrl_0_0_0_3,
  prodUrl: prodUrl_0_0_0_3,
  path: '/api/chat/stream',
  method: Method.POST,
  requestHeaders: {},
  requestBodyType: RequestBodyType.json,
  responseBodyType: ResponseBodyType.raw,
  dataKey: dataKey_0_0_0_3,
  paramNames: [],
  queryNames: [],
  requestDataOptional: false,
  requestDataJsonSchema: {},
  responseDataJsonSchema: {},
  requestFunctionName: 'requestChatStream',
  queryStringArrayFormat: QueryStringArrayFormat.brackets,
  extraInfo: {},
}

/**
 * 接口 流式聊天 的 **请求函数**
 *
 * @分类 chat
 * @请求头 `POST /api/chat/stream`
 */
export const requestChatStream = /*#__PURE__*/ (
  requestData: RequestChatStreamRequest,
  ...args: UserRequestRestArgs
) => {
  return request<RequestChatStreamResponse>(prepare(requestChatStreamRequestConfig, requestData), ...args)
}

requestChatStream.requestConfig = requestChatStreamRequestConfig

/* prettier-ignore-end */
