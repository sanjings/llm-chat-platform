import { getPaginationMaxPageSize } from './offset-pagination.util';

const DEFAULT_MESSAGE_PAGE_SIZE = 30;

export type MessageCursorPayload = { id: number; t: string };

export function encodeMessageCursor(payload: MessageCursorPayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

export function decodeMessageCursor(raw?: string): MessageCursorPayload | undefined {
  if (!raw?.trim()) return undefined;
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf8');
    const o = JSON.parse(json) as MessageCursorPayload;
    if (typeof o.id !== 'number' || typeof o.t !== 'string') return undefined;
    return o;
  } catch {
    return undefined;
  }
}

export function resolveMessagePageSize(pageSize?: number) {
  let size = pageSize ?? DEFAULT_MESSAGE_PAGE_SIZE;
  const max = getPaginationMaxPageSize();
  if (max > 0) {
    size = Math.min(size, max);
  }
  return Math.max(1, size);
}
