/** 与前端 utils/stream.ts 保持同一套流式错误事件协议。 */
export type ChatStreamErrorCode = 'upstream_error' | 'timeout' | 'connection_closed' | 'save_failed';

export type ChatStreamErrorPayload = {
  type: 'chat-error';
  code: ChatStreamErrorCode;
  message: string;
};

/**
 * 自定义 SSE 事件名。正常模型增量只有 data，不带 event；
 * 这里用错误事件名 + data.type 双重标记，前端不会把它当成模型 chunk。
 */
export const CHAT_STREAM_ERROR_EVENT = 'error';

export const saveFailureMessage = '回复已生成，但未能保存到历史记录，请先复制需要的内容。';

const errorCodeOf = (error: unknown): string => {
  if (error && typeof error === 'object') {
    const code = (error as { code?: unknown }).code;
    if (typeof code === 'string') return code;
  }
  return '';
};

const errorTextOf = (error: unknown): string => {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return '';
};

/** 把上游/网络异常归成前端可直接展示的几类提示。 */
export const classifyStreamError = (
  error: unknown
): { code: Exclude<ChatStreamErrorCode, 'save_failed'>; message: string } => {
  const code = errorCodeOf(error).toUpperCase();
  const text = errorTextOf(error);

  if (
    code === 'ETIMEDOUT' ||
    code === 'ESOCKETTIMEDOUT' ||
    code === 'ECONNABORTED' ||
    /timeout|timed out|超时/i.test(text)
  ) {
    return { code: 'timeout', message: 'AI 服务响应超时，请稍后重试' };
  }

  if (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ECONNREFUSED' ||
    code === 'EHOSTUNREACH' ||
    code === 'ENETUNREACH' ||
    code === 'ENOTFOUND' ||
    code === 'EAI_AGAIN' ||
    code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    /aborted|socket hang up|premature|connection.*(reset|closed|refused)/i.test(text)
  ) {
    return { code: 'connection_closed', message: 'AI 服务连接中断，请稍后重试' };
  }

  return { code: 'upstream_error', message: 'AI 服务响应失败，请稍后重试' };
};

/**
 * 以空行开头，避免上游最后一个 chunk 停在半行时把 event 行拼进 JSON。
 * 多余空行对 SSE 解析无害。
 */
export const formatChatStreamError = (code: ChatStreamErrorCode, message: string): string => {
  const payload: ChatStreamErrorPayload = { type: 'chat-error', code, message };
  return `\n\nevent: ${CHAT_STREAM_ERROR_EVENT}\ndata: ${JSON.stringify(payload)}\n\n`;
};
