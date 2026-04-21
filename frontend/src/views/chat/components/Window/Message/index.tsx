import { useEffect, useLayoutEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import type { Message } from '@/store/chat';
import MsgItem from './Item';
import './index.scss';

export interface ChatBoxRef {
  scrollToBottom: () => void;
}

const ChatBox = forwardRef<ChatBoxRef, { sessionKey: string; messages: Message[] }>(
  ({ sessionKey, messages }, forwardedRef) => {
    const listRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const frameRef = useRef<number | null>(null);

    const scrollToBottom = () => {
      shouldAutoScrollRef.current = true;
      const el = listRef.current;
      if (!el) return;
      el.scrollTop = el.scrollHeight;
    };

    useLayoutEffect(() => {
      scrollToBottom();
    }, [sessionKey]);

    useEffect(() => {
      if (!bottomRef.current || !shouldAutoScrollRef.current) return;
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
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

    useImperativeHandle(forwardedRef, () => ({
      scrollToBottom
    }));

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
        <div ref={bottomRef} />
      </div>
    );
  }
);

ChatBox.displayName = 'ChatBox';

export default ChatBox;
