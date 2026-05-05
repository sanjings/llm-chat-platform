/**
 * 服务端数据返回统一格式
 */
export interface ApiResponseData<T = unknown> {
  /**
   * 状态码 200成功
   */
  code: number;
  /**
   * 返回数据
   */
  data: T;
  /**
   * 提示信息
   */
  message: string;
}
