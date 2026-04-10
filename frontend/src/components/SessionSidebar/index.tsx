import { requestDeleteSession, requestSessionList, requestUpdateSessionTitle } from '@/services/api/session';
import type { AuthUser } from '@/services/api/auth';
import defaultAvatar from '@/assets/images/avatar.png';
import type { Session } from 'types/chat';
import { Avatar, Button, Input, Modal, Popconfirm, Space, Switch, Typography } from 'antd';
import { useEffect, useState } from 'react';
import './index.scss';

interface SessionSidebarProps {
  currentUser: AuthUser;
  currentSessionId: string | null;
  listVersion: number;
  onSelectSession: (id: string) => void;
  onCreateSession: () => void;
  onLogout: () => void;
  darkMode: boolean;
  onChangeDarkMode: (value: boolean) => void;
}

export default function SessionSidebar({
  currentUser,
  currentSessionId,
  listVersion,
  onSelectSession,
  onCreateSession,
  onLogout,
  darkMode,
  onChangeDarkMode
}: SessionSidebarProps) {
  const [sessionList, setSessionList] = useState<Session[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const getSessionList = async () => {
    const res = await requestSessionList();
    setSessionList(res || []);
  };

  useEffect(() => {
    getSessionList();
  }, [listVersion]);

  const submitRename = async () => {
    if (!editingId) return;
    const title = editingTitle.trim();
    if (!title) return;
    await requestUpdateSessionTitle(editingId, title);
    setEditingId(null);
    setEditingTitle('');
    getSessionList();
  };

  return (
    <div className="session-sidebar">
      <div className="session-sidebar-header">
        <Avatar size={44} src={currentUser.avatar || defaultAvatar} />
        <Typography.Text strong>{currentUser.nickname}</Typography.Text>
      </div>
      <Space className="session-sidebar-toolbar">
        <Switch checked={darkMode} onChange={onChangeDarkMode} checkedChildren="深色" unCheckedChildren="浅色" />
        <Button size="small" onClick={onLogout}>
          退出
        </Button>
      </Space>
      <Button type="primary" block onClick={onCreateSession}>
        开启新对话
      </Button>
      <ul className="session-list">
        {sessionList.map((item) => {
          return (
            <li
              className={`session-item ${item.id === currentSessionId ? 'active' : ''}`}
              key={item.id}
              onClick={() => onSelectSession(item.id)}
            >
              <span className="title">{item.title}</span>
              <Space size={8}>
                <a
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingId(item.id);
                    setEditingTitle(item.title);
                  }}
                >
                  改名
                </a>
                <Popconfirm
                  title="删除会话"
                  description="删除后不可恢复，确认删除吗？"
                  onConfirm={async (e) => {
                    e?.stopPropagation();
                    await requestDeleteSession(item.id);
                    if (item.id === currentSessionId) onCreateSession();
                    getSessionList();
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <a
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                    删除
                  </a>
                </Popconfirm>
              </Space>
            </li>
          );
        })}
      </ul>
      <Modal
        title="修改会话标题"
        open={Boolean(editingId)}
        onOk={submitRename}
        onCancel={() => {
          setEditingId(null);
          setEditingTitle('');
        }}
      >
        <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} maxLength={40} />
      </Modal>
    </div>
  );
}
