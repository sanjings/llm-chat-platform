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

/**
 * 流式对话
 */
export async function requestChat(
  messages: Message[],
  sessionId: string | null,
  onDelta: (delta: StreamTextDelta) => void,
  options?: { modelId?: string; signal?: AbortSignal; responseFormat?: ResponseFormatType }
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
  const reader = res.body!.getReader();
  await readStream(reader, onDelta);
  return { sessionId: nextSessionId };
}

/** 新会话可选模型。可用性由服务端按已配置的 API Key 计算。 */
export const requestChatModels = async () => {
  const res = await requestGet<{ models: ChatModelOption[] }>('/api/chat/models');
  if (res.code !== ApiResponseCode.SUCCESS || !Array.isArray(res.data?.models)) {
    throw new Error(res.message || '模型列表加载失败');
  }
  return res.data.models;
};
