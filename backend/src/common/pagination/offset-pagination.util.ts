const DEFAULT_PAGE_NO = 1;
const DEFAULT_PAGE_SIZE = 20;

/** 解析环境变量中的单页上限；0 或未配置表示不截断 */
export function getPaginationMaxPageSize(): number {
  const raw = process.env.PAGINATION_MAX_PAGE_SIZE?.trim();
  if (!raw) return 0;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function resolveOffsetPagination(pageNo?: number, pageSize?: number) {
  const page = Math.max(1, pageNo ?? DEFAULT_PAGE_NO);
  let size = pageSize ?? DEFAULT_PAGE_SIZE;
  const max = getPaginationMaxPageSize();
  if (max > 0) {
    size = Math.min(size, max);
  }
  size = Math.max(1, size);
  return {
    skip: (page - 1) * size,
    take: size,
    pageNo: page,
    pageSize: size
  };
}
