import { useEffect, useLayoutEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';
import type { Message } from '@/store/chat';
import MsgItem from './Item';
import './index.scss';
import { UpCircleOutlined } from '@ant-design/icons';
import { isMobile } from '@/utils/env';

export interface ChatBoxRef {
  scrollToBottom: () => void;
}

const ChatBox = forwardRef<ChatBoxRef, { sessionKey: string; messages: Message[] }>(
  ({ sessionKey, messages }, forwardedRef) => {
    const listRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const frameRef = useRef<number | null>(null);
    const [distanceToBottom, setDistanceToBottom] = useState(0);
    const [viewportHeight, setViewportHeight] = useState(0);

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
      if (frameRef.current != null) {
        cancelAnimationFrame(frameRef.current);
      }
      frameRef.current = requestAnimationFrame(() => {
        if (bottomRef.current && shouldAutoScrollRef.current) {
          bottomRef.current.scrollIntoView({ behavior: 'auto' });
        }
        const el = listRef.current;
        if (el) {
          setDistanceToBottom(el.scrollHeight - el.scrollTop - el.clientHeight);
          setViewportHeight(el.clientHeight);
        }
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
      setDistanceToBottom(distanceToBottom);
      setViewportHeight(el.clientHeight);
    };

    const showDown = useMemo(() => {
      if (!isMobile || messages.length === 0) return false;
      return distanceToBottom > viewportHeight;
    }, [distanceToBottom, messages.length, viewportHeight]);

    return (
      <div className="message-container">
        <div className="message-list" ref={listRef} onScroll={onScroll}>
          {messages?.map((m, i) => (
            <MsgItem key={m.localId || m.id || `${m.role}-${i}`} msg={m} />
          ))}
          <div ref={bottomRef} />
        </div>
        {showDown && <UpCircleOutlined className="bottom-icon" onClick={scrollToBottom} />}
      </div>
    );
  }
);

ChatBox.displayName = 'ChatBox';

export default ChatBox;
