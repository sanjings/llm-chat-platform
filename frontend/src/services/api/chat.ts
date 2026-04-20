import type { Message } from '@/store/chat';
import { readStream } from '@/utils/stream';
import { getCache } from '@/utils/cache';
import { safeParse } from '@/utils';
import type { ModelType, ResponseFormatType } from '@/constants/chat';

/**
 * 流式对话。modelId 预留给下一版多模型，不传则走后端环境变量默认模型。
 */
export async function requestChat(
  messages: Message[],
  sessionId: string | null,
  onDelta: (text: string) => void,
  options?: { modelId?: ModelType; signal?: AbortSignal; responseFormat?: ResponseFormatType }
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
  if (!res.ok) throw new Error('请求失败');
  const nextSessionId = res.headers.get('session-id');
  const reader = res.body!.getReader();
  await readStream(reader, onDelta);
  return { sessionId: nextSessionId };
}
