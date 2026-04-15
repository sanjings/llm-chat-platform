import { useEffect, useRef } from 'react';
import type { Message } from 'types/chat';
import MsgItem from './Item';
import './index.scss';

export default function ChatBox({ messages }: { messages: Message[] }) {
  const listRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ref.current || !shouldAutoScrollRef.current) return;
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
    }
    frameRef.current = requestAnimationFrame(() => {
      ref.current?.scrollIntoView({ behavior: 'auto' });
      frameRef.current = null;
    });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const threshold = 80;
    const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldAutoScrollRef.current = distanceToBottom <= threshold;
  };

  return (
    <div className="message-list" ref={listRef} onScroll={onScroll}>
      {messages?.map((m, i) => (
        <MsgItem key={m.localId || m.id || `${m.role}-${i}`} msg={m} />
      ))}
      <div ref={ref} />
    </div>
  );
}
