import { create } from 'zustand';
import { requestChat } from '@/services/api/chat';
import { requestSessionMessages } from '@/services/api/session';
import type { Message } from 'types/chat';
import { ApiResponseCode } from '@/services/request';

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
  loadSessionMessages: (sessionId: string, force?: boolean) => Promise<void>;
  sendMessage: (sessionId: string | null, text: string, options?: SendMessageOptions) => Promise<void>;
  stopSessionStream: (sessionId: string | null) => void;
};

const controllers = new Map<string, AbortController>();
const rafIds = new Map<string, number>();
const buffers = new Map<string, string>();
const MAX_CONTEXT_MESSAGES = 12;
const MAX_CONTEXT_CHARS = 10000;

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

export const useChatStore = create<ChatState>()((set, get) => ({
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
      const res = await requestSessionMessages(sessionId);
      if (res.code !== ApiResponseCode.SUCCESS) return;

      const list = (res.data.list || []).map((msg) => ({
        ...msg,
        localId: String(msg.id || createLocalId())
      }));

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

  sendMessage: async (sessionId, text, options) => {
    const content = text.trim();
    if (!content) return;

    const sessionKey = getSessionKey(sessionId);
    const requestId = createLocalId();
    const userLocalId = createLocalId();
    const assistantLocalId = createLocalId();
    const controller = new AbortController();

    controllers.get(sessionKey)?.abort();
    controllers.set(sessionKey, controller);
    buffers.set(sessionKey, '');

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
      const chunk = buffers.get(sessionKey) || '';
      if (!chunk) return;
      buffers.set(sessionKey, '');
      set((state) => {
        const stream = ensureStreamState(state.streamBySession[sessionKey]);
        if (stream.requestId !== requestId) return state;
        const prev = state.messagesBySession[sessionKey] || [];
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i -= 1) {
          const msg = next[i];
          if (msg.role === 'assistant' && msg.requestId === requestId) {
            next[i] = { ...msg, content: (msg.content || '') + chunk };
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

    const enqueueDelta = (delta: string) => {
      if (!delta) return;
      const stream = ensureStreamState(get().streamBySession[sessionKey]);
      if (stream.requestId !== requestId) return;
      buffers.set(sessionKey, (buffers.get(sessionKey) || '') + delta);
      if (rafIds.has(sessionKey)) return;
      const rafId = requestAnimationFrame(() => {
        rafIds.delete(sessionKey);
        flushDelta();
      });
      rafIds.set(sessionKey, rafId);
    };

    try {
      const baseMessages = get().messagesBySession[sessionKey] || [];
      const normalizedPayload = buildRequestMessages(baseMessages);
      const result = await requestChat(normalizedPayload, sessionId, enqueueDelta, {
        signal: controller.signal,
        responseFormat: 'markdown'
      });

      if (rafIds.has(sessionKey)) {
        cancelAnimationFrame(rafIds.get(sessionKey)!);
        rafIds.delete(sessionKey);
      }
      flushDelta();

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

      const aborted = error instanceof DOMException && error.name === 'AbortError';
      set((state) => ({
        streamBySession: {
          ...state.streamBySession,
          [sessionKey]: {
            status: aborted ? 'stopped' : 'error',
            requestId: null,
            error: aborted ? null : String(error)
          }
        }
      }));
    } finally {
      buffers.delete(sessionKey);
      controllers.delete(sessionKey);
    }
  },

  stopSessionStream: (sessionId) => {
    const sessionKey = getSessionKey(sessionId);
    controllers.get(sessionKey)?.abort();
    set((state) => ({
      streamBySession: {
        ...state.streamBySession,
        [sessionKey]: { status: 'stopped', requestId: null, error: null }
      }
    }));
  }
}));
