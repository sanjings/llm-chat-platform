export interface Message {
  id?: number;
  localId?: string;
  requestId?: string;
  sessionId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createTime?: string;
}

export interface Session {
  id: string;
  title?: string;
  createTime?: string;
  updateTime?: string;
}

/** 会话详情（不含消息列表，消息用 requestSessionMessages） */
export interface SessionDetail extends Session {
  userId: string;
}

export interface PaginatedSessions {
  list: Session[];
  total: number;
  pageNo: number;
  pageSize: number;
}

export interface SessionMessagesPage {
  list: Message[];
  nextCursor: string | null;
  hasMore: boolean;
  pageSize: number;
}
