import type { PageListResponse, PageQueryParam } from 'types/api';
import { requestGet, requestPost, requestDelete } from '../request';
import type { Session, SessionDetail, SessionMessagesPage } from 'types/chat';

export const requestSessionList = async (params: PageQueryParam) => {
  return await requestGet<PageListResponse<Session>>('/session/list', {
    params
  });
};

export const requestSessionDetail = async (id: string) => {
  return await requestGet<SessionDetail>(`/session/detail/${id}`);
};

export const requestSessionMessages = async (sessionId: string, params?: { cursor?: string; pageSize?: number }) => {
  return await requestGet<SessionMessagesPage>(`/session/messages/${sessionId}`, { params });
};

export const requestCreateSession = async (title?: string) => {
  return await requestPost<Session>('/session/create', { title });
};

export const requestUpdateSessionTitle = async (id: string, title: string) => {
  return await requestPost<Session>(`/session/title/update`, { id, title });
};

export const requestDeleteSession = async (id: string) => {
  return await requestDelete<Session>(`/session/delete/${id}`);
};
