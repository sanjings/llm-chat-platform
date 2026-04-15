import { useState } from 'react';
import { Button } from 'antd';
import { ArrowUpOutlined, PauseOutlined } from '@ant-design/icons';
import './index.scss';
import { DRAFT_SESSION_KEY, useChatStore } from '@/store/chat';

export default function ChatInput({ sessionId, onSend }: { sessionId: string | null; onSend: (msg: string) => void }) {
  const sessionKey = sessionId ?? DRAFT_SESSION_KEY;
  const replying = useChatStore(
    (state) => state.streamBySession[sessionKey]?.status === 'streaming'
  );
  const stopSessionStream = useChatStore((state) => state.stopSessionStream);

  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim() || replying) return;
    onSend(text);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <div className="input-box">
      <textarea
        className="input-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="发消息...（Shift+Enter换行，Enter发送）"
      />
      <div className="actions">
        {replying ? (
          <Button type="primary" shape="circle" icon={<PauseOutlined />} onClick={() => stopSessionStream(sessionId)} />
        ) : (
          <Button type="primary" shape="circle" icon={<ArrowUpOutlined />} onClick={send} disabled={!text.trim()} />
        )}
      </div>
    </div>
  );
}
