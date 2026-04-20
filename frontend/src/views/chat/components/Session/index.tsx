import { requestSessionList, requestSessionDeleteId } from '@/services/swagger/session';
import { DeleteOutlined, EllipsisOutlined, FormOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, message, Modal } from 'antd';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RequestSessionListResponse } from '@/services/swagger/session';
import './index.scss';
import RenameModal from './Rename';
import { ApiResponseCode } from '@/services/request';
import { useAppStore } from '@/store/app';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';

type Session = RequestSessionListResponse['list'][number];

export default function SessionBox({
  listVersion,
  onSelectSession,
  onCreateSession
}: {
  listVersion: number;
  onSelectSession: (session: Session) => void;
  onCreateSession: () => void;
}) {
  const navigate = useNavigate();
  const narrowLayout = useNarrowLayout();
  const setCollapsed = useAppStore((state) => state.setCollapsed);
  const { sessionId } = useParams();
  const [sessionList, setSessionList] = useState<Session[]>([]);
  const [curSession, setCurSession] = useState<Session | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);

  const getSessionList = useCallback(async () => {
    const res = await requestSessionList({ pageNo: '1', pageSize: '5000' });
    setSessionList(res.data.list || []);
  }, []);

  useEffect(() => {
    getSessionList();
  }, [listVersion, getSessionList]);

  useEffect(() => {
    if (!sessionId) return;
    const matched = sessionList.find((item) => item.id === sessionId);
    if (matched) {
      onSelectSession(matched);
    }
  }, [sessionId, sessionList, onSelectSession]);

  const onDeleteSession = async (id: string) => {
    Modal.confirm({
      title: '永久删除对话？',
      content: '删除后，该对话将不可恢复。确认删除吗？',
      icon: null,
      okText: '确认',
      okType: 'danger',
      cancelText: '取消',
      onOk: async () => {
        const res = await requestSessionDeleteId({ id });
        if (res.code === ApiResponseCode.SUCCESS) {
          message.success('删除成功');
          getSessionList();
        } else {
          message.error(res.message || '删除失败');
          return Promise.reject();
        }
      }
    });
  };

  return (
    <div className="session-container">
      <Button
        type="primary"
        icon={<PlusCircleOutlined />}
        shape="round"
        size="large"
        block
        onClick={() => {
          if (narrowLayout) {
            setCollapsed(true);
          }
          onCreateSession();
          navigate('/chat');
        }}>
        开启新对话
      </Button>

      <ul className="session-list">
        {sessionList.map((item) => (
          <li
            key={item.id}
            className={`session-list-item ${item.id === sessionId ? 'active' : ''}`}
            onClick={() => {
              if (narrowLayout) {
                setCollapsed(true);
              }
              onSelectSession(item);
              navigate(`/chat/${item.id}`);
            }}>
            <span className="session-list-item-title">{item.title}</span>
            <Dropdown
              menu={{
                items: [
                  {
                    label: '重命名',
                    key: 'rename',
                    icon: <FormOutlined />,
                    onClick: ({ domEvent }) => {
                      domEvent.stopPropagation();
                      setCurSession(item);
                      setRenameOpen(true);
                    }
                  },
                  {
                    label: '删除',
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    onClick: ({ domEvent }) => {
                      domEvent.stopPropagation();
                      onDeleteSession(item.id);
                    }
                  }
                ]
              }}
              arrow={false}
              trigger={['click']}>
              <div onClick={(e) => e.stopPropagation()} className="session-list-item-ellipsis">
                <EllipsisOutlined style={{ marginLeft: 8, fontSize: 16 }} />
              </div>
            </Dropdown>
          </li>
        ))}
      </ul>

      <RenameModal
        open={renameOpen}
        sessionId={curSession?.id}
        sessionTitle={curSession?.title}
        onFinish={() => getSessionList()}
        onCancel={() => setRenameOpen(false)}
      />
    </div>
  );
}
