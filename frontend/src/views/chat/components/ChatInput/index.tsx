// src/components/ChatInput.tsx
import { useState } from 'react';

export default function ChatInput({
  onSend,
  loading,
}: {
  onSend: (msg: string) => void;
  loading: boolean;
}) {
  const [text, setText] = useState('');

  const send = () => {
    if (!text.trim() || loading) return;
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
    <div style={{ padding: '16px', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
      <textarea
        style={{ flex: 1, padding: '12px', minHeight: '40px', resize: 'vertical' }}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="输入消息...（Shift+Enter换行，Enter发送）"
        disabled={loading}
      />
      <button onClick={send} disabled={loading} style={{ padding: '12px 16px', height: '40px' }}>
        {loading ? '发送中...' : '发送'}
      </button>
    </div>
  );
}