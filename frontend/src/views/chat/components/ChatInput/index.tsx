import { useState } from 'react';
import { Button } from 'antd';
import { ArrowUpOutlined } from '@ant-design/icons';

import './index.scss';

export default function ChatInput({ onSend, loading }: { onSend: (msg: string) => void; loading: boolean }) {
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
    <div className="input-box">
      <textarea
        className="input-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="发消息...（Shift+Enter换行，Enter发送）"
        disabled={loading}
      />
      <div className="actions">
        <Button type="primary" shape="circle" icon={<ArrowUpOutlined />} onClick={send} disabled={loading} />
      </div>
    </div>
  );
}
