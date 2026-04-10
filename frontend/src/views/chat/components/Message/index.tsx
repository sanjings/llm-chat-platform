import type { Message } from 'types/chat';
import './index.scss';

export default function MsgItem({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div
      className={`message-item ${isUser ? 'message-item--user' : 'message-item--assistant'}`}
      style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}
    >
      {msg.content}
    </div>
  );
}
