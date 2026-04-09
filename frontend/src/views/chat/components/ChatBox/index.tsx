import { useEffect, useRef } from 'react';
import type { Message } from '../../../../types/chat';
import MsgItem from '../Message';

export default function ChatBox({ messages }: { messages: Message[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div
      style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {messages.map((m, i) => (
        <MsgItem key={i} msg={m} />
      ))}
      <div ref={ref} />
    </div>
  );
}