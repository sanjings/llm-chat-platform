import { useEffect, useRef } from 'react';
import type { Message } from 'types/chat';
import MsgItem from '../Message';
import './index.scss';

export default function ChatBox({ messages }: { messages: Message[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="message-list">
      {messages.map((m, i) => (
        <MsgItem key={i} msg={m} />
      ))}
      <div ref={ref} />
    </div>
  );
}
