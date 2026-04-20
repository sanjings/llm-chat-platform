import { useEffect, useState } from 'react';
import { Skeleton } from 'antd';
import ChatMessage from './Message/index';
import Prompt from './Prompt/index';
import type { Message } from '@/store/chat';
import { type RequestSessionListResponse } from '@/services/swagger/session';
import Model from './Model';
import { DRAFT_SESSION_KEY, useChatStore } from '@/store/chat';
import './index.scss';
import { ModelType, ResponseFormatType } from '@/constants/chat';

const EMPTY_MESSAGES: Message[] = [];

interface ChatViewProps {
  curSession: RequestSessionListResponse['list'][number] | null;
  onSessionCreated: (sessionId: string) => void;
  onSessionUpdated: () => void;
}

export default function ChatWindow({ curSession, onSessionCreated, onSessionUpdated }: ChatViewProps) {
  const [curModel, setCurModel] = useState<ModelType>(ModelType.QWEN_MAX);
  const sessionId = curSession?.id ?? null;
  const sessionKey = sessionId ?? DRAFT_SESSION_KEY;
  const setActiveSessionId = useChatStore((state) => state.setActiveSessionId);
  const loadSessionMessages = useChatStore((state) => state.loadSessionMessages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const loading = useChatStore((state) => (sessionId ? state.loadingBySession[sessionId] : false));

  const messages = useChatStore((state) => state.messagesBySession[sessionKey] ?? EMPTY_MESSAGES);

  const isEmptyView = messages.length === 0;
  const showHistorySkeleton = Boolean(sessionId && loading && isEmptyView);
  const centeredLayout = isEmptyView && !showHistorySkeleton;

  useEffect(() => {
    setActiveSessionId(sessionId);
    if (!sessionId) {
      return;
    }
    loadSessionMessages(sessionId);
  }, [sessionId, setActiveSessionId, loadSessionMessages]);

  const handleSend = async (text: string) => {
    const modelForRequest = (curSession?.llmModelId?.trim() || curModel) as ModelType;
    await sendMessage(sessionId, text, modelForRequest, ResponseFormatType.MARKDOWN, {
      onSessionCreated,
      onSessionUpdated
    });
  };

  return (
    <div className="chat-window">
      {curSession?.title && <h1 className="chat-window-title">{curSession?.title}</h1>}
      <div className="chat-window-inner" style={{ justifyContent: centeredLayout ? 'center' : 'flex-start' }}>
        {showHistorySkeleton ? (
          <div className="chat-window-skeleton">
            <Skeleton active paragraph={{ rows: 8 }} title={false} />
          </div>
        ) : (
          !isEmptyView && <ChatMessage sessionKey={sessionKey} messages={messages} />
        )}
        <div>
          {isEmptyView && !showHistorySkeleton && <Model onChange={setCurModel} />}
          <Prompt sessionId={sessionId} onSend={handleSend} />
          {!isEmptyView && <p className="ai-tip">内容由 AI 生成，请仔细甄别</p>}
        </div>
      </div>
    </div>
  );
}
