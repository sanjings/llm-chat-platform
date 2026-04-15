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

/**
 * 分页查询参数
 */
export type PageQueryParam<T extends Recordable = Recordable> = {
  /**
   * 当前页码
   */
  pageNo?: number;
  /**
   * 每页查询条数
   */
  pageSize: number;
} & T;

type Listable = Recordable | string | number;

/**
 * 分页查询列表数据
 */
export interface PageListResponse<T extends Listable = Listable> {
  /**
   * 当前列表数据
   */
  list: Array<T>;
  /**
   * 总条数
   */
  total: number;
  /**
   * 总页数
   */
  totalPage?: number;
}
