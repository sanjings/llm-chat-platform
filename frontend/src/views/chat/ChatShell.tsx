import SessionSidebar from '@/components/SessionSidebar';
import type { AuthUser } from '@/services/api/auth';
import { Layout } from 'antd';
import { useState } from 'react';
import ChatView from './ChatView';
import './ChatShell.scss';

interface ChatShellProps {
  currentUser: AuthUser;
  onLogout: () => void;
  darkMode: boolean;
  onChangeDarkMode: (value: boolean) => void;
}

const { Sider, Content } = Layout;

/** 登录后的整页：左侧会话列表 + 右侧聊天 */
export default function ChatShell({ currentUser, onLogout, darkMode, onChangeDarkMode }: ChatShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);

  return (
    <Layout className="chat-shell">
      <Sider collapsed={collapsed} onCollapse={setCollapsed} collapsible collapsedWidth={0} width={260}>
        <SessionSidebar
          currentUser={currentUser}
          currentSessionId={currentSessionId}
          listVersion={listVersion}
          onSelectSession={setCurrentSessionId}
          onCreateSession={() => setCurrentSessionId(null)}
          onLogout={onLogout}
          darkMode={darkMode}
          onChangeDarkMode={onChangeDarkMode}
        />
      </Sider>
      <Content>
        <ChatView
          currentSessionId={currentSessionId}
          onSessionCreated={(sessionId) => {
            setCurrentSessionId(sessionId);
            setListVersion((v) => v + 1);
          }}
          onSessionUpdated={() => setListVersion((v) => v + 1)}
        />
      </Content>
    </Layout>
  );
}
