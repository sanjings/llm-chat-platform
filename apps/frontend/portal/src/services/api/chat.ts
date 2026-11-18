import type { Message } from '@/store/chat';
import { readStream, type StreamTextDelta } from '@/utils/stream';
import { getCache } from '@/utils/cache';
import { safeParse } from '@/utils';
import { ApiResponseCode, requestGet } from '@/services/request';
import type { ResponseFormatType } from '@/constants/chat';

export type ChatModelOption = {
  id: string;
  provider: 'dashscope' | 'openai_compatible';
  available: boolean;
  unavailableReason?: string | null;
};

export type ChatModelList = {
  models: ChatModelOption[];
  defaultModelId: string;
};

/**
 * 流式对话
 * onSessionId：响应头一到就把后端会话 ID 交出来（早于流结束），停止按钮的协作取消要用。
 */
export async function requestChat(
  messages: Message[],
  sessionId: string | null,
  onDelta: (delta: StreamTextDelta) => void,
  options?: {
    modelId?: string;
    signal?: AbortSignal;
    responseFormat?: ResponseFormatType;
    onSessionId?: (sessionId: string) => void;
  }
) {
  const token = safeParse(getCache('STORE_USER'))?.state?.token;
  const res = await fetch('/api/chat/stream', {
    method: 'POST',
    signal: options?.signal,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify({
      messages,
      sessionId,
      ...(options?.modelId ? { modelId: options.modelId } : {}),
      ...(options?.responseFormat ? { responseFormat: options.responseFormat } : {})
    })
  });
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message || '请求失败');
  }
  if (!res.ok) throw new Error('请求失败');
  const nextSessionId = res.headers.get('session-id');
  if (nextSessionId) options?.onSessionId?.(nextSessionId);
  const reader = res.body!.getReader();
  await readStream(reader, onDelta);
  return { sessionId: nextSessionId };
}

/** 协作停止的超时：cancel 请求发出后流仍未收尾，就放弃等待、直接断开。 */
export const CANCEL_STREAM_GRACE_MS = 8000;

/**
 * 请求后端协作停止某个会话的进行中流。
 * 后端对已结束/不存在的流幂等返回成功；网络失败或超时（内置 signal）时返回 false / 抛错。
 */
export async function requestCancelChatStream(sessionId: string, timeoutMs = CANCEL_STREAM_GRACE_MS): Promise<boolean> {
  const token = safeParse(getCache('STORE_USER'))?.state?.token;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('/api/chat/stream/cancel', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ sessionId })
    });
    return res.ok;
  } finally {
    clearTimeout(timer);
  }
}

/** 当前部署的可选模型与默认模型。可用性由服务端按已配置的 API Key 计算。 */
export const requestChatModels = async () => {
  const res = await requestGet<ChatModelList>('/api/chat/models');
  if (res.code !== ApiResponseCode.SUCCESS || !Array.isArray(res.data?.models)) {
    throw new Error(res.message || '模型列表加载失败');
  }
  return {
    models: res.data.models,
    defaultModelId: typeof res.data.defaultModelId === 'string' ? res.data.defaultModelId.trim() : ''
  };
};
