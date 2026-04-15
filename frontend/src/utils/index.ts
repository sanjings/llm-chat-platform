/**
 * 阻塞同步代码
 * @param {number} ms 延迟的毫秒数
 * @throws {Error} 当传入的参数不是正数时抛出错误
 */
export const sleep = (ms: number): Promise<void> => {
  if (ms <= 0 || !Number.isFinite(ms)) {
    throw new Error('延迟时间必须是一个正数');
  }
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
};

/**
 * 获取文件名后缀
 * @param {string} fileName 文件名
 * @returns {string} 文件后缀（包含点号），如果没有后缀或文件名无效则返回空字符串
 */
export const getFileNameSuffix = (fileName: string): string => {
  if (!fileName || typeof fileName !== 'string') return '';
  const lastDotIndex = fileName.lastIndexOf('.');
  return lastDotIndex === -1 ? '' : fileName.slice(lastDotIndex);
};

/**
 * 安全序列化参数，处理边界情况
 * @param {unknown} value 需要序列化的值
 * @returns {string} 序列化后的字符串
 * @description
 * - 对对象键进行排序，确保相同参数但顺序不同也能识别为相同请求
 * - 处理 null/undefined 值
 * - 处理序列化失败的情况（如循环引用）
 */
export const safeStringify = (value: unknown): string => {
  if (value == null) return '';
  try {
    // 对对象键进行排序，确保相同参数但顺序不同也能识别为相同请求
    if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
      return JSON.stringify(value, Object.keys(value).sort());
    }
    return JSON.stringify(value);
  } catch {
    // 如果序列化失败（如循环引用），返回字符串表示
    return String(value);
  }
};

/**
 * 安全解析 JSON 字符串，处理边界情况
 * @param {string} jsonString 需要解析的 JSON 字符串
 * @param {T} defaultValue 解析失败时的默认值，默认为 null
 * @returns {T | null} 解析后的对象或默认值
 * @description
 * - 处理无效的 JSON 字符串
 * - 处理空字符串、null、undefined
 * - 提供默认值选项
 * - 提供更好的错误处理
 * @example
 * ```ts
 * // 基本使用
 * const data = safeParse('{"name": "test"}'); // { name: "test" }
 *
 * // 使用默认值
 * const data = safeParse('invalid json', {}); // {}
 *
 * // 处理空值
 * const data = safeParse(''); // null
 * ```
 */
export const safeParse = <T = any>(jsonString: string | null | undefined, defaultValue: T | null = null): T | null => {
  // 处理空值
  if (jsonString == null || jsonString === '') {
    return defaultValue;
  }

  // 确保是字符串类型
  if (typeof jsonString !== 'string') {
    return defaultValue;
  }

  // 去除首尾空白字符
  const trimmed = jsonString.trim();
  if (trimmed === '') {
    return defaultValue;
  }

  try {
    return JSON.parse(trimmed) as T;
  } catch (error) {
    // 解析失败时返回默认值
    console.warn('JSON parse failed:', error instanceof Error ? error.message : String(error), '\nString:', jsonString);
    return defaultValue;
  }
};
