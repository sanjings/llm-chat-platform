import { useState } from 'react';
import ChatBox from './components/ChatBox/index';
import ChatInput from './components/ChatInput/index';
import type { Message } from '../../types/chat';
import { requestChat } from '../../services/api/chat';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    const userMsg: Message = { role: 'user', content: text };
    // 1. 先添加用户消息，AI消息用空字符串初始化
    setMessages(prev => [...prev, userMsg, { role: 'assistant', content: '' }]);
    setLoading(true);

    try {
      await requestChat([...messages, userMsg], (delta) => {
        // 2. 函数式更新，每次创建新数组+新对象，React 100%只更新一次
        setMessages(prev => {
          // 复制数组，不修改原数据
          const newMessages = [...prev];
          // 定位最后一条AI消息
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg) {
            // 🔴 核心：创建新对象，覆盖原消息，彻底杜绝重复
            newMessages[newMessages.length - 1] = {
              ...lastMsg,
              content: lastMsg.content + delta
            };
          }
          return newMessages;
        });
      });
    } catch (err) {
      setMessages(prev => {
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg) {
          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            content: '出错：' + String(err)
          };
        }
        return newMessages;
      });
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <h1 style={{ padding: 16, textAlign: 'center' }}>AI 聊天</h1>
      <ChatBox messages={messages} />
      <ChatInput onSend={send} loading={loading} />
    </div>
  );
}