export interface Message {
  id?: number;
  sessionId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createTime?: string;
}

export interface Session {
  id: string;
  title: string;
  createTime: string;
  updateTime: string;
}

export interface SessionDetail extends Session {
  userId: string;
  messages: Message[];
}
