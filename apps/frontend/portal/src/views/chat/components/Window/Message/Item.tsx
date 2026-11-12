import type { Message } from '@/store/chat';
import { memo, useState } from 'react';
import Markdown from '@/components/Markdown';
import './item.scss';

const ReasoningBlock = ({ text }: { text: string }) => {
  const [expanded, setExpanded] = useState(true);

  return (
    <details className="message-reasoning" open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)}>
      <summary>思考过程</summary>
      <div className="message-reasoning-body">{text}</div>
    </details>
  );
};

const MsgItem = ({ msg }: { msg: Message }) => {
  const isUser = msg.role === 'user';

  return (
    <div
      className={`message-item ${isUser ? 'message-item--user' : 'message-item--assistant'}`}
      style={{ alignSelf: isUser ? 'flex-end' : 'flex-start' }}>
      {msg.role === 'assistant' ? (
        <>
          {msg.reasoning ? <ReasoningBlock text={msg.reasoning} /> : null}
          <Markdown>{msg.content || ''}</Markdown>
        </>
      ) : (
        msg.content
      )}
    </div>
  );
};

export default memo(MsgItem);
