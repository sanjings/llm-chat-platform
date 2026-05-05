/** 日志中需打码的字段名（不区分大小写，子串匹配键名） */
const SENSITIVE_KEY =
  /password|passwd|pwd|token|secret|authorization|accessToken|refreshToken|apiKey|api[_-]?key|creditCard|cookie|jwt/i;

const MAX_DEPTH = 10;
const DEFAULT_MAX_STRING = 1024;

/**
 * 脱敏 + 截断长字符串，避免日志爆量、泄露凭据。
 * 聊天类大字段（如 messages[].content）仍可见前若干字符便于排错。
 */
export function sanitizeForLog(input: unknown, maxStringLength: number = DEFAULT_MAX_STRING, depth = 0): unknown {
  if (depth > MAX_DEPTH) return '[MaxDepth]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'string') {
    if (input.length <= maxStringLength) return input;
    return `${input.slice(0, maxStringLength)}...(truncated,len=${input.length})`;
  }
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) {
    return input.map((item) => sanitizeForLog(item, maxStringLength, depth + 1));
  }
  const obj = input as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY.test(k)) {
      out[k] = '[REDACTED]';
    } else {
      out[k] = sanitizeForLog(v, maxStringLength, depth + 1);
    }
  }
  return out;
}

export function safeJson(obj: unknown): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return '[Unserializable]';
  }
}
