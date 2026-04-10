import { useEffect, useState } from 'react';
import ChatBox from './components/ChatBox/index';
import ChatInput from './components/ChatInput/index';
import type { Message } from 'types/chat';
import { requestChat } from '@/services/api/chat';
import { requestSessionDetail } from '@/services/api/session';
import './ChatView.scss';

interface ChatViewProps {
  currentSessionId: string | null;
  onSessionCreated: (sessionId: string) => void;
  onSessionUpdated: () => void;
}

/** 中间主区域：消息列表 + 输入框 */
export default function ChatView({ currentSessionId, onSessionCreated, onSessionUpdated }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadHistory = async () => {
      if (!currentSessionId) {
        setMessages([]);
        return;
      }
      const detail = await requestSessionDetail(currentSessionId);
      setMessages(detail?.messages || []);
    };
    loadHistory();
  }, [currentSessionId]);

  const send = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setLoading(true);
    try {
      const result = await requestChat([...messages, userMsg], currentSessionId, (delta) => {
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last) {
            next[next.length - 1] = { ...last, content: last.content + delta };
          }
          return next;
        });
      });
      if (!currentSessionId && result.sessionId) {
        onSessionCreated(result.sessionId);
      }
      onSessionUpdated();
    } catch (err) {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last) {
          next[next.length - 1] = { ...last, content: '出错：' + String(err) };
        }
        return next;
      });
    }
    setLoading(false);
  };

  return (
    <div className="chat-window">
      <h1 className="chat-window-title">AI 聊天</h1>
      <div className="chat-window-inner">
        <ChatBox messages={messages} />
        <ChatInput onSend={send} loading={loading} />
      </div>
    </div>
  );
}
