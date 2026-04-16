import type { Message } from 'types/chat';
import { memo } from 'react';
import Markdown from '@/components/Markdown';
import './item.scss';

const MsgItem = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user';

  return (
    <div
      className={`message-item ${isUser ? 'message-item--user' : 'message-item--assistant'}`}
      style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
      {msg.role === 'assistant' ? <Markdown>{msg.content}</Markdown> : msg.content}
    </div>
  );
};

export default memo(MsgItem);
