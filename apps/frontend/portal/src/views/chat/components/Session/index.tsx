import { requestSessionList, requestSessionDeleteId, requestSessionDetailId } from '@/services/swagger/session';
import { DeleteOutlined, EllipsisOutlined, FormOutlined, PlusCircleOutlined } from '@ant-design/icons';
import { Button, Dropdown, message, Modal } from 'antd';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { RequestSessionListResponse } from '@/services/swagger/session';
import './index.scss';
import RenameModal from './Rename';
import { ApiResponseCode } from '@/services/request';
import { useAppStore } from '@/store/app';
import { useChatStore } from '@/store/chat';
import { useNarrowLayout } from '@/hooks/useNarrowLayout';
import {
  createSessionListPager,
  resolveSessionForRoute,
  shouldLoadToFillViewport,
  type SessionItem,
  type SessionListState
} from './sessionListPaging';

type Session = RequestSessionListResponse['list'][number];

/** 距底部多少像素开始预取下一页，避免滚动到底才发请求产生空档。 */
const LOAD_NEXT_THRESHOLD = 48;

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
  const removeSession = useChatStore((state) => state.removeSession);
  const { sessionId } = useParams();
  const listRef = useRef<HTMLUListElement>(null);
  const [state, setState] = useState<SessionListState>({
    list: [],
    total: 0,
    nextPageNo: 1,
    loading: false,
    error: null,
    hasMore: true,
    loaded: false,
    scrollRestoreVersion: 0
  });
  const [curSession, setCurSession] = useState<Session | null>(null);
  const [renameOpen, setRenameOpen] = useState(false);
  const scrollTopBeforeAppend = useRef(0);
  const shouldRestoreScroll = useRef(false);
  const detailCache = useRef<Record<string, SessionItem | null>>({});

  const captureScrollTop = useCallback(() => {
    scrollTopBeforeAppend.current = listRef.current?.scrollTop ?? 0;
  }, []);
  const markScrollRestore = useCallback(() => {
    shouldRestoreScroll.current = true;
  }, []);

  const pagerRef = useRef<ReturnType<typeof createSessionListPager> | null>(null);
  useEffect(() => {
    const pager = createSessionListPager({
      fetchPage: async (pageNo, pageSize) => {
        const res = await requestSessionList({ pageNo: String(pageNo), pageSize: String(pageSize) });
        if (res.code !== ApiResponseCode.SUCCESS) {
          throw new Error(res.message || '会话列表加载失败');
        }
        return { list: res.data.list || [], total: Number(res.data.total) || 0, pageSize: res.data.pageSize };
      },
      onChange: setState,
      onBeforeAppend: captureScrollTop,
      onAfterAppend: markScrollRestore
    });
    pagerRef.current = pager;
    return () => {
      pager.dispose();
      if (pagerRef.current === pager) pagerRef.current = null;
    };
  }, [captureScrollTop, markScrollRestore]);

  // 追加的条目渲染后把滚动位置放回原处，避免内容变多时列表跳动。
  useLayoutEffect(() => {
    if (!shouldRestoreScroll.current || !listRef.current) return;
    listRef.current.scrollTop = scrollTopBeforeAppend.current;
    shouldRestoreScroll.current = false;
  }, [state.scrollRestoreVersion]);

  // 视口没填满时（列表没有滚动条：高窗口、服务端下调 pageSize）继续拉下一页，直到填满、末页或出错。
  const fillViewportIfPossible = useCallback(() => {
    const el = listRef.current;
    const pager = pagerRef.current;
    if (!el || !pager) return;
    const rect = el.getBoundingClientRect();
    // 抽屉关闭时面板被 translateX 移出视口（高度仍在），必须按不可见处理，否则会把剩余页全部拉完。
    const visible = rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
    const metrics = { visible, scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollTop: el.scrollTop };
    if (shouldLoadToFillViewport(pager.getState(), metrics)) void pager.loadNext();
  }, []);

  // 每次渲染后判定：加载完成、抽屉开合、父级重渲染都会走到这里；判定为 true 时由分页状态机保证一次只发一页。
  useLayoutEffect(() => {
    fillViewportIfPossible();
  });

  // 视口/列表容器尺寸变化时重新判定；卸载时移除监听并断开 observer。
  useEffect(() => {
    window.addEventListener('resize', fillViewportIfPossible);
    const el = listRef.current;
    const observer = new ResizeObserver(fillViewportIfPossible);
    if (el) observer.observe(el);
    return () => {
      window.removeEventListener('resize', fillViewportIfPossible);
      observer.disconnect();
    };
  }, [fillViewportIfPossible]);

  const resetList = useCallback(() => {
    shouldRestoreScroll.current = false;
    detailCache.current = {};
    if (listRef.current) listRef.current.scrollTop = 0;
    void pagerRef.current?.reset();
  }, []);

  useEffect(() => {
    resetList();
  }, [listVersion, resetList]);

  useEffect(() => {
    if (!sessionId) return;
    let active = true;
    const fetchDetail = async (id: string) => {
      if (id in detailCache.current) return detailCache.current[id];
      const res = await requestSessionDetailId({ id });
      const detail = res.code === ApiResponseCode.SUCCESS ? res.data : null;
      detailCache.current[id] = detail;
      return detail;
    };
    void resolveSessionForRoute(sessionId, state.list, fetchDetail)
      .then((session) => {
        // 快速切换会话时，晚到的详情不能覆盖当前路由选中的会话。
        if (active && session) onSelectSession(session);
      })
      .catch(() => {
        // 详情拉取失败时保留父级占位，不打断会话切换。
      });
    return () => {
      active = false;
    };
  }, [sessionId, state.list, onSelectSession]);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - LOAD_NEXT_THRESHOLD) {
      void pagerRef.current?.loadNext();
    }
  };

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
          if (sessionId && id === sessionId) {
            removeSession(id);
            navigate('/chat', { replace: true });
          }
          resetList();
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

      <ul className="session-list" ref={listRef} onScroll={onListScroll}>
        {state.list.map((item) => (
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
        {state.error && (
          <li className="session-list-error" onClick={() => void pagerRef.current?.retry()}>
            {state.error}，点击重试
          </li>
        )}
      </ul>

      <RenameModal
        open={renameOpen}
        sessionId={curSession?.id}
        sessionTitle={curSession?.title}
        onFinish={resetList}
        onCancel={() => setRenameOpen(false)}
      />
    </div>
  );
}
