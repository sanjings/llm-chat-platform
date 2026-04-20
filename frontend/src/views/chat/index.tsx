import { Layout, Typography } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SessionBox from './components/Session';
import ThemeSwitch from '@/components/ThemeSwitch';
import User from './components/User';
import ChatWindow from './components/Window';
import type { RequestSessionListResponse } from '@/services/swagger/session';
import './index.scss';

type Session = RequestSessionListResponse['list'][number];

const { Sider, Content } = Layout;

export default function ChatPage() {
  const navigate = useNavigate();
  const { sessionId } = useParams<{ sessionId: string }>();
  const [collapsed, setCollapsed] = useState(false);
  const [listVersion, setListVersion] = useState(0);
  const [curSession, setCurSession] = useState<Session | null>(null);
  const handleSelectSession = useCallback((session: Session) => {
    setCurSession(session);
  }, []);
  const handleCreateSession = useCallback(() => {
    setCurSession(null);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setCurSession(null);
      return;
    }
    setCurSession((prev) => (prev?.id === sessionId ? prev : ({ id: sessionId } as Session)));
  }, [sessionId]);

  return (
    <Layout className="chat-layout">
      <Sider
        collapsed={collapsed}
        onCollapse={setCollapsed}
        collapsible
        collapsedWidth={0}
        width={260}
        className="chat-layout-sider">
        <div className="chat-layout-sider-inner">
          <div className="chat-layout-sider-inner__header">
            <Typography.Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>
              LLM Chat
            </Typography.Title>
            <ThemeSwitch />
          </div>
          <div className="chat-layout-sider-inner__content">
            <SessionBox
              listVersion={listVersion}
              onSelectSession={handleSelectSession}
              onCreateSession={handleCreateSession}
            />
          </div>
          <div className="chat-layout-sider-inner__footer">
            <User />
          </div>
        </div>
      </Sider>
      <Content className="chat-layout-content">
        <ChatWindow
          curSession={curSession}
          onSessionCreated={(newSessionId) => {
            setListVersion((v) => v + 1);
            navigate(`/chat/${newSessionId}`);
          }}
          onSessionUpdated={() => setListVersion((v) => v + 1)}
        />
      </Content>
    </Layout>
  );
}
