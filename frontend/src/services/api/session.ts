import { http } from '../request';
import type { Session, SessionDetail } from 'types/chat';

export const requestSessionList = async () => {
  const { data } = await http.get<Session[]>('/session/list');
  return data;
};

export const requestSessionDetail = async (id: string) => {
  const { data } = await http.get<SessionDetail>(`/session/detail/${id}`);
  return data;
};

export const requestCreateSession = async (title?: string) => {
  const { data } = await http.post<Session>('/session/create', { title });
  return data;
};

export const requestUpdateSessionTitle = async (id: string, title: string) => {
  const { data } = await http.patch<Session>(`/session/title/${id}`, { title });
  return data;
};

export const requestDeleteSession = async (id: string) => {
  const { data } = await http.delete<Session>(`/session/${id}`);
  return data;
};
