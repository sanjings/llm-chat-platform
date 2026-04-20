import { Button, Typography } from 'antd';
import { useCallback, useEffect, useState, type CSSProperties } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import SessionBox from './components/Session';
import ThemeSwitch from '@/components/ThemeSwitch';
import User from './components/User';
import ChatWindow from './components/Window';
import { useAppStore } from '@/store/app';
import type { RequestSessionListResponse } from '@/services/swagger/session';
import './index.scss';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';

type Session = RequestSessionListResponse['list'][number];

const MOBILE_DRAWER_WIDTH = 300;
const PC_DRAWER_WIDTH = 260;

export default function ChatPage() {
  const navigate = useNavigate();
  const narrowLayout = useNarrowLayout();
  const collapsed = useAppStore((state) => state.collapsed);
  const setCollapsed = useAppStore((state) => state.setCollapsed);
  const { sessionId } = useParams<{ sessionId: string }>();
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

  const drawerWidth = narrowLayout ? MOBILE_DRAWER_WIDTH : PC_DRAWER_WIDTH;

  const rootClassName = `chat-page${narrowLayout ? ' chat-page--mobile' : ' chat-page--desktop'}${!collapsed ? ' chat-page--drawer-open' : ''}`;
  const rootStyle: CSSProperties = {
    ['--chat-drawer-width' as string]: `${drawerWidth}px`
  };

  return (
    <div className={rootClassName} style={rootStyle}>
      <div className="chat-page__shelf">
        <aside className="chat-page__panel" aria-hidden={collapsed}>
          <div className="chat-page__panel-inner">
            <div className="chat-page__panel-header">
              <Typography.Title level={3} style={{ margin: 0, color: 'var(--app-text)' }}>
                LLM Chat
              </Typography.Title>
              <ThemeSwitch />
            </div>
            <div className="chat-page__panel-body">
              <SessionBox
                listVersion={listVersion}
                onSelectSession={handleSelectSession}
                onCreateSession={handleCreateSession}
              />
            </div>
            <div className="chat-page__panel-footer">
              <User />
            </div>
          </div>
        </aside>
      </div>

      <main className="chat-page__main">
        {narrowLayout && !collapsed && (
          <button type="button" className="chat-page__mask" onClick={() => setCollapsed(true)} />
        )}

        <div className="chat-page__main-inner" onClick={(e) => e.stopPropagation()}>
          {!narrowLayout && (
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              className="chat-page__drawer-toggle chat-page__drawer-toggle--dock"
              onClick={() => setCollapsed(!collapsed)}
            />
          )}
          {narrowLayout && collapsed && (
            <Button
              type="text"
              icon={<MenuUnfoldOutlined />}
              className="chat-page__drawer-toggle chat-page__drawer-toggle--fab"
              onClick={(e) => {
                e.stopPropagation();
                setCollapsed(false);
              }}
            />
          )}
          <ChatWindow
            curSession={curSession}
            onSessionCreated={(newSessionId) => {
              setListVersion((v) => v + 1);
              navigate(`/chat/${newSessionId}`);
            }}
            onSessionUpdated={() => setListVersion((v) => v + 1)}
          />
        </div>
      </main>
    </div>
  );
}
