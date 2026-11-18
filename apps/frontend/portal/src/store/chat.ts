import { message } from 'antd';
import { create } from 'zustand';
import { CANCEL_STREAM_GRACE_MS, requestCancelChatStream, requestChat } from '@/services/api/chat';
import {
  requestSessionMessagesSessionId,
  type RequestSessionMessagesSessionIdResponse
} from '@/services/swagger/session';
import { ApiResponseCode } from '@/services/request';
import { ResponseFormatType } from '@/constants/chat';

export type Message = PartialKey<
  GetArrayItem<RequestSessionMessagesSessionIdResponse['list']>,
  'id' | 'sessionId' | 'createTime'
> & {
  localId?: string;
  requestId?: string;
  /** 推理过程。有思考时和正文分开；普通消息没有该字段。 */
  reasoning?: string | null;
};

export const DRAFT_SESSION_KEY = '__draft__';

type StreamStatus = 'idle' | 'streaming' | 'stopped' | 'error';

type SessionStreamState = {
  status: StreamStatus;
  requestId: string | null;
  error: string | null;
};

type SendMessageOptions = {
  onSessionCreated?: (sessionId: string) => void;
  onSessionUpdated?: () => void;
};

type ChatState = {
  activeSessionId: string | null;
  messagesBySession: Record<string, Message[]>;
  streamBySession: Record<string, SessionStreamState>;
  loadingBySession: Record<string, boolean>;
  setActiveSessionId: (sessionId: string | null) => void;
  /** 移除本地缓存的消息与流状态，并中止该会话的请求（用于会话被删除等场景） */
  removeSession: (sessionId: string) => void;
  loadSessionMessages: (sessionId: string, force?: boolean) => Promise<void>;
  sendMessage: (
    sessionId: string | null,
    text: string,
    modelId?: string,
    responseFormat?: ResponseFormatType,
    options?: SendMessageOptions
  ) => Promise<void>;
  stopSessionStream: (sessionId: string | null) => void;
};

const controllers = new Map<string, AbortController>();
const rafIds = new Map<string, number>();
type PendingDelta = { content: string; reasoning: string };
const buffers = new Map<string, PendingDelta>();
const emptyPending = (): PendingDelta => ({ content: '', reasoning: '' });
/** 进行中流的后端会话 ID（响应头一到就登记），供停止时的协作取消使用；key 为 sessionKey。 */
const streamBackendSessionIds = new Map<string, string>();

/** 与后端 utils/chat-stream-events.ts 的 saveFailureMessage 保持同一句。 */
const SAVE_FAILURE_MESSAGE = '回复已生成，但未能保存到历史记录，请先复制需要的内容。';

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * 两条文本是否指向同一份已生成内容：完全相等，或共享前 30 个字符。
 * 流被中途停止时，气泡与落库内容长度可能不同，逐字比较会误报。
 */
const sameGeneratedText = (left?: string | null, right?: string | null) => {
  const a = left?.trim();
  const b = right?.trim();
  if (!a || !b) return false;
  if (a === b) return true;
  const head = (text: string) => text.slice(0, 30);
  return a.startsWith(head(b)) || b.startsWith(head(a));
};
/**
 * 前端只做发送前的粗略裁剪，真正的权威裁剪在后端（会按模型和 LLM_CONTEXT_* 环境变量再裁一次）。
 * 这里取略宽于后端现代模型默认（40 条 / 64000 字符）的传输上限，
 * 避免前端先吃掉新增的上下文，导致部署调大 LLM_CONTEXT_* 后后端仍收不到。
 */
const MAX_CONTEXT_MESSAGES = 80;
const MAX_CONTEXT_CHARS = 120000;

const getSessionKey = (sessionId: string | null) => sessionId ?? DRAFT_SESSION_KEY;

const createLocalId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
};

const ensureStreamState = (stream?: SessionStreamState): SessionStreamState => {
  return (
    stream || {
      status: 'idle',
      requestId: null,
      error: null
    }
  );
};

type RequestMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const buildRequestMessages = (messages: Message[]): RequestMessage[] => {
  const cleaned: RequestMessage[] = messages
    .filter((msg): msg is Message & { role: 'user' | 'assistant' | 'system' } => {
      return (msg.role === 'user' || msg.role === 'assistant' || msg.role === 'system') && Boolean(msg.content?.trim());
    })
    .map((msg) => ({ role: msg.role, content: msg.content.trim() }));

  if (!cleaned.length) return [];

  const lastUserIndex = cleaned.map((msg) => msg.role).lastIndexOf('user');
  if (lastUserIndex < 0) return [];
  const untilUser = cleaned.slice(0, lastUserIndex + 1);

  const systems = untilUser.filter((msg) => msg.role === 'system');
  const dialog = untilUser.filter((msg) => msg.role !== 'system');
  const recentDialog = dialog.slice(-MAX_CONTEXT_MESSAGES);

  const merged: RequestMessage[] = [...systems, ...recentDialog];
  let totalChars = merged.reduce((sum, item) => sum + item.content.length, 0);
  while (totalChars > MAX_CONTEXT_CHARS) {
    const removableIndex = merged.findIndex((item, index) => item.role !== 'system' && index < merged.length - 1);
    if (removableIndex < 0) break;
    totalChars -= merged[removableIndex].content.length;
    merged.splice(removableIndex, 1);
  }

  return merged;
};

export const useChatStore = create<ChatState>()((set, get) => {
  /**
   * 协作停止流程：
   * 1. 先请求后端 cancel（后端会保存已生成内容，保存失败时在仍打开的 SSE 上发 save_failed）；
   * 2. 等现有 SSE 自然结束（sendMessage 的 finally 会清掉 controllers），期间不 abort；
   * 3. cancel 失败或宽限时间内流仍未结束，才 fallback abort；
   * 4. fallback 之后若这条助手消息已有正文/思考，再核对历史：没保存成功就弹「未能保存」。
   */
  const requestCooperativeStop = async (
    sessionKey: string,
    requestId: string | null,
    backendSessionId: string | null
  ) => {
    const abortCurrent = () => controllers.get(sessionKey)?.abort();

    const verifySavedOrToast = async () => {
      if (!backendSessionId || !requestId) return;
      const bubble = (get().messagesBySession[sessionKey] || []).find(
        (msg) => msg.role === 'assistant' && msg.requestId === requestId
      );
      // 本来就没有内容/思考，后端也不会保存，谈不上失败。
      if (!bubble || (!bubble.content?.trim() && !bubble.reasoning?.trim())) return;
      try {
        // 只查询历史做核对，不要 loadSessionMessages：保存失败时那会把本地尚未入库的气泡覆盖掉，用户反而没法复制。
        const res = await requestSessionMessagesSessionId({ sessionId: backendSessionId });
        if (res.code !== ApiResponseCode.SUCCESS) {
          message.error(SAVE_FAILURE_MESSAGE);
          return;
        }
        const history = res.data.list || [];
        const saved = history.some((msg) => {
          const reasoning = (msg as { reasoning?: string | null }).reasoning;
          return (
            msg.role === 'assistant' &&
            (sameGeneratedText(msg.content, bubble.content) || sameGeneratedText(reasoning, bubble.reasoning))
          );
        });
        if (!saved) message.error(SAVE_FAILURE_MESSAGE);
      } catch {
        // 历史拉不到时按未保存提示，避免刷新后内容丢失还毫无说明。
        message.error(SAVE_FAILURE_MESSAGE);
      }
    };

    // 拿不到后端 sessionId（响应头还没到就点了停止）：只能直接断开，交给后端 disconnect 路径尽力保存。
    if (!backendSessionId) {
      abortCurrent();
      return;
    }

    let needVerify = false;
    try {
      const ok = await requestCancelChatStream(backendSessionId);
      if (!ok) throw new Error('cancel failed');
    } catch {
      // cancel 请求失败（网络/接口异常）：fallback 断开，让后端走 disconnect 尽力保存。
      needVerify = true;
      abortCurrent();
    }

    // 等流收尾：sendMessage 成功或 catch 结束时会清掉 controllers。
    const deadline = Date.now() + CANCEL_STREAM_GRACE_MS;
    while (controllers.has(sessionKey) && Date.now() < deadline) {
      await sleep(100);
    }

    if (controllers.has(sessionKey)) {
      // cancel 后流仍未结束：fallback 断开，再核对历史里是否真的保存成功。
      needVerify = true;
      abortCurrent();
      await sleep(50);
    }
    if (needVerify) await verifySavedOrToast();
  };

  return {
    activeSessionId: null,
    messagesBySession: {},
    streamBySession: {},
    loadingBySession: {},

    setActiveSessionId: (sessionId) =>
      set((state) => {
        if (state.activeSessionId === sessionId) {
          return state;
        }
        return { activeSessionId: sessionId };
      }),

    removeSession: (sessionId) => {
      const sessionKey = getSessionKey(sessionId);
      controllers.get(sessionKey)?.abort();
      controllers.delete(sessionKey);
      streamBackendSessionIds.delete(sessionKey);
      const rafId = rafIds.get(sessionKey);
      if (rafId !== undefined) {
        cancelAnimationFrame(rafId);
        rafIds.delete(sessionKey);
      }
      buffers.delete(sessionKey);

      set((state) => {
        const nextMessages = { ...state.messagesBySession };
        const nextStream = { ...state.streamBySession };
        const nextLoading = { ...state.loadingBySession };
        delete nextMessages[sessionKey];
        delete nextStream[sessionKey];
        delete nextLoading[sessionKey];
        return {
          messagesBySession: nextMessages,
          streamBySession: nextStream,
          loadingBySession: nextLoading,
          activeSessionId: state.activeSessionId === sessionId ? null : state.activeSessionId
        };
      });
    },

    loadSessionMessages: async (sessionId, force = false) => {
      const exists = get().messagesBySession[sessionId];
      if (!force && exists?.length) return;

      set((state) => ({
        loadingBySession: {
          ...state.loadingBySession,
          [sessionId]: true
        }
      }));

      try {
        const res = await requestSessionMessagesSessionId({ sessionId });
        if (res.code !== ApiResponseCode.SUCCESS) return;

        const list = (res.data.list || []).map((msg) => {
          const reasoning = (msg as { reasoning?: string | null }).reasoning;
          return {
            ...msg,
            ...(typeof reasoning === 'string' && reasoning ? { reasoning } : {}),
            localId: String(msg.id || createLocalId())
          };
        });

        set((state) => ({
          messagesBySession: {
            ...state.messagesBySession,
            [sessionId]: list
          }
        }));
      } finally {
        set((state) => ({
          loadingBySession: {
            ...state.loadingBySession,
            [sessionId]: false
          }
        }));
      }
    },

    sendMessage: async (sessionId, text, modelId, responseFormat = ResponseFormatType.MARKDOWN, options) => {
      const content = text.trim();
      if (!content) return;

      const sessionKey = getSessionKey(sessionId);
      const requestId = createLocalId();
      const userLocalId = createLocalId();
      const assistantLocalId = createLocalId();
      const controller = new AbortController();

      controllers.get(sessionKey)?.abort();
      controllers.set(sessionKey, controller);
      streamBackendSessionIds.delete(sessionKey);
      buffers.set(sessionKey, emptyPending());

      set((state) => {
        const prev = state.messagesBySession[sessionKey] || [];
        const userMsg: Message = { role: 'user', content, localId: userLocalId };
        const assistantMsg: Message = { role: 'assistant', content: '', localId: assistantLocalId, requestId };
        return {
          messagesBySession: {
            ...state.messagesBySession,
            [sessionKey]: [...prev, userMsg, assistantMsg]
          },
          streamBySession: {
            ...state.streamBySession,
            [sessionKey]: { status: 'streaming', requestId, error: null }
          }
        };
      });

      const flushDelta = () => {
        const pending = buffers.get(sessionKey) || emptyPending();
        if (!pending.content && !pending.reasoning) return;
        buffers.set(sessionKey, emptyPending());
        set((state) => {
          const stream = ensureStreamState(state.streamBySession[sessionKey]);
          if (stream.requestId !== requestId) return state;
          const prev = state.messagesBySession[sessionKey] || [];
          const next = [...prev];
          for (let i = next.length - 1; i >= 0; i -= 1) {
            const msg = next[i];
            if (msg.role === 'assistant' && msg.requestId === requestId) {
              const reasoning = pending.reasoning ? `${msg.reasoning || ''}${pending.reasoning}` : msg.reasoning;
              next[i] = {
                ...msg,
                content: (msg.content || '') + pending.content,
                ...(reasoning ? { reasoning } : {})
              };
              break;
            }
          }
          return {
            ...state,
            messagesBySession: {
              ...state.messagesBySession,
              [sessionKey]: next
            }
          };
        });
      };

      const enqueueDelta = (delta: { content: string; reasoning: string }) => {
        if (!delta.content && !delta.reasoning) return;
        const stream = ensureStreamState(get().streamBySession[sessionKey]);
        if (stream.requestId !== requestId) return;
        const pending = buffers.get(sessionKey) || emptyPending();
        buffers.set(sessionKey, {
          content: pending.content + delta.content,
          reasoning: pending.reasoning + delta.reasoning
        });
        if (rafIds.has(sessionKey)) return;
        const rafId = requestAnimationFrame(() => {
          rafIds.delete(sessionKey);
          flushDelta();
        });
        rafIds.set(sessionKey, rafId);
      };

      /** 停止或失败后，没有正文/思考的占位气泡不应留在界面上。 */
      const removeEmptyAssistant = () => {
        set((state) => {
          const prev = state.messagesBySession[sessionKey] || [];
          const next = prev.filter(
            (msg) =>
              !(
                msg.role === 'assistant' &&
                msg.requestId === requestId &&
                !msg.content?.trim() &&
                !msg.reasoning?.trim()
              )
          );
          if (next.length === prev.length) return state;
          return {
            ...state,
            messagesBySession: {
              ...state.messagesBySession,
              [sessionKey]: next
            }
          };
        });
      };

      try {
        const baseMessages = get().messagesBySession[sessionKey] || [];
        const normalizedPayload = buildRequestMessages(baseMessages);
        const result = await requestChat(normalizedPayload, sessionId, enqueueDelta, {
          modelId,
          responseFormat,
          signal: controller.signal,
          // 响应头一到就登记后端会话 ID：停止按钮要用它发起协作取消（草稿会话此刻还没有 sessionId）。
          onSessionId: (createdId) => streamBackendSessionIds.set(sessionKey, createdId)
        });

        if (rafIds.has(sessionKey)) {
          cancelAnimationFrame(rafIds.get(sessionKey)!);
          rafIds.delete(sessionKey);
        }
        flushDelta();
        removeEmptyAssistant();

        const createdSessionId = result.sessionId;
        if (!sessionId && createdSessionId) {
          set((state) => {
            const draftMessages = state.messagesBySession[sessionKey] || [];
            const draftStream = ensureStreamState(state.streamBySession[sessionKey]);
            const nextMessagesBySession = { ...state.messagesBySession };
            const nextStreamBySession = { ...state.streamBySession };
            delete nextMessagesBySession[sessionKey];
            delete nextStreamBySession[sessionKey];
            nextMessagesBySession[createdSessionId] = draftMessages;
            nextStreamBySession[createdSessionId] = { ...draftStream, status: 'idle', requestId: null, error: null };
            return {
              messagesBySession: nextMessagesBySession,
              streamBySession: nextStreamBySession,
              activeSessionId: createdSessionId
            };
          });
          controllers.delete(sessionKey);
          options?.onSessionCreated?.(createdSessionId);
        } else {
          set((state) => ({
            streamBySession: {
              ...state.streamBySession,
              [sessionKey]: { status: 'idle', requestId: null, error: null }
            }
          }));
        }
        options?.onSessionUpdated?.();
      } catch (error) {
        if (rafIds.has(sessionKey)) {
          cancelAnimationFrame(rafIds.get(sessionKey)!);
          rafIds.delete(sessionKey);
        }
        flushDelta();
        const aborted =
          (error instanceof DOMException && error.name === 'AbortError') ||
          (error instanceof Error && error.name === 'AbortError');
        if (!aborted) {
          const reason = error instanceof Error ? error.message : '请求失败';
          message.error(reason || '请求失败');
        }
        removeEmptyAssistant();
        set((state) => ({
          streamBySession: {
            ...state.streamBySession,
            [sessionKey]: {
              status: aborted ? 'stopped' : 'error',
              requestId: null,
              error: aborted ? null : error instanceof Error ? error.message : String(error)
            }
          }
        }));
      } finally {
        buffers.delete(sessionKey);
        controllers.delete(sessionKey);
        streamBackendSessionIds.delete(sessionKey);
      }
    },

    stopSessionStream: (sessionId) => {
      const sessionKey = getSessionKey(sessionId);
      const requestId = ensureStreamState(get().streamBySession[sessionKey]).requestId;
      // 先把状态标成 stopped 并保留 requestId：未 flush 的增量仍能写进这条助手气泡。
      set((state) => {
        const stream = ensureStreamState(state.streamBySession[sessionKey]);
        return {
          streamBySession: {
            ...state.streamBySession,
            [sessionKey]: { ...stream, status: 'stopped', error: null }
          }
        };
      });
      // 草稿会话没有 sessionId，用响应头里登记的后端会话 ID 发起协作取消。
      const backendSessionId = sessionId ?? streamBackendSessionIds.get(sessionKey) ?? null;
      void requestCooperativeStop(sessionKey, requestId, backendSessionId);
    }
  };
});
