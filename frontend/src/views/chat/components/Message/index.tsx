import type { Message } from '../../../../types/chat';

export default function MsgItem({ msg }: { msg: Message }) {
  const isUser = msg.role === 'user';
  return (
    <div
      style={{
        maxWidth: '80%',
        padding: '10px 14px',
        borderRadius: '10px',
        margin: '8px 0',
        alignSelf: isUser ? 'flex-end' : 'flex-start',
        backgroundColor: isUser ? '#e3f2fd' : '#f5f5f5',
      }}
    >
      {msg.content}
    </div>
  );
}