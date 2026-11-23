import type { RequestSessionListResponse } from '@/services/swagger/session';

export type SessionItem = RequestSessionListResponse['list'][number];

/** 侧栏按需加载：首屏只取有限条数，触底再逐页追加。 */
export const SESSION_LIST_PAGE_SIZE = 20;

export type SessionPage = {
  list: SessionItem[];
  total: number;
  /** 服务端可能按 PAGINATION_MAX_PAGE_SIZE 下调每页数量，以返回值计算是否还有下一页。 */
  pageSize?: number;
};

export type SessionListState = {
  list: SessionItem[];
  total: number;
  /** 下一次要请求的页码。 */
  nextPageNo: number;
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loaded: boolean;
  /** 每次成功追加自增；即使整页重复 id、列表长度不变，组件也能据此恢复 scrollTop。重置清零。 */
  scrollRestoreVersion: number;
};

/** 视口几何：容器不可见时由调用方置 visible=false，未布局/离屏裁剪时 clientHeight 为 0。 */
export type ViewportMetrics = {
  /** 容器是否与视口相交（抽屉关闭时面板被移出屏幕，此时必须按不可见处理）。 */
  visible: boolean;
  /** 含溢出内容的总高度。 */
  scrollHeight: number;
  /** 容器可视区高度；0 表示未布局或被隐藏。 */
  clientHeight: number;
  /** 当前滚动位置。 */
  scrollTop: number;
};

type PagerOptions = {
  fetchPage: (pageNo: number, pageSize: number) => Promise<SessionPage>;
  onChange?: (state: SessionListState) => void;
  /** 追加前读取当前滚动位置，追加后由调用方在同一位置恢复。 */
  onBeforeAppend?: () => void;
  onAfterAppend?: () => void;
};

const initialState = (): SessionListState => ({
  list: [],
  total: 0,
  nextPageNo: 1,
  loading: false,
  error: null,
  hasMore: true,
  loaded: false,
  scrollRestoreVersion: 0
});

/**
 * 会话列表分页状态机：
 * - reset 重新从第一页开始，并让仍在飞行的旧页码请求失效；
 * - loadNext 同时只允许一个请求，按 session id 去重后追加；
 * - 末页由 total 与服务端实际 pageSize 判定，失败后必须显式 retry；retry 同样受 pending 约束，只允许一个在途重试。
 */
export const createSessionListPager = ({ fetchPage, onChange, onBeforeAppend, onAfterAppend }: PagerOptions) => {
  let state = initialState();
  let generation = 0;
  let pending = false;
  let failedPageNo: number | null = null;

  const publish = (next: SessionListState) => {
    state = next;
    onChange?.(state);
  };

  const mergeWithoutDuplicates = (current: SessionItem[], incoming: SessionItem[]) => {
    const seen = new Set(current.map((item) => item.id));
    const appended = incoming.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    return [...current, ...appended];
  };

  const load = async (mode: 'reset' | 'next', force = false, targetPageNo?: number) => {
    const isAppend = mode === 'next';
    // 显式 retry（force）同样受 pending 约束：连续两次 retry 只允许一个在途请求；
    // 非 force 的 reset 仍可打断并覆盖在途请求的 generation。
    if (force && pending) return;
    if (isAppend && !force && (pending || state.error || !state.hasMore || !state.loaded)) return;
    if (isAppend && force) {
      // retry 的错误态会挡住普通 loadNext，这里先清掉再重新请求同一页。
      publish({ ...state, error: null });
    }

    const currentGeneration = ++generation;
    const pageNo = targetPageNo ?? (mode === 'reset' ? 1 : state.nextPageNo);
    pending = true;
    publish({ ...state, loading: true, error: null });

    try {
      const page = await fetchPage(pageNo, SESSION_LIST_PAGE_SIZE);
      if (currentGeneration !== generation) return;
      failedPageNo = null;

      const incoming = page.list || [];
      const list = isAppend ? mergeWithoutDuplicates(state.list, incoming) : mergeWithoutDuplicates([], incoming);
      const effectivePageSize = page.pageSize && page.pageSize > 0 ? page.pageSize : SESSION_LIST_PAGE_SIZE;
      if (isAppend) onBeforeAppend?.();
      publish({
        list,
        total: page.total,
        nextPageNo: pageNo + 1,
        loading: false,
        error: null,
        hasMore: incoming.length > 0 && pageNo * effectivePageSize < page.total,
        loaded: true,
        // 每次成功追加都自增版本号，即使本页全是重复 id 导致 list.length 不变，组件也能据此触发 scrollTop 恢复。
        scrollRestoreVersion: isAppend ? state.scrollRestoreVersion + 1 : 0
      });
      if (isAppend) onAfterAppend?.();
    } catch (error) {
      if (currentGeneration !== generation) return;
      failedPageNo = pageNo;
      publish({
        ...state,
        loading: false,
        error: error instanceof Error ? error.message : '会话列表加载失败'
      });
    } finally {
      if (currentGeneration === generation) pending = false;
    }
  };

  return {
    getState: () => state,
    reset: () => load('reset'),
    loadNext: () => load('next'),
    retry: () => {
      const pageNo = failedPageNo ?? 1;
      // 重置失败时旧列表可能还在，必须按实际失败页重试而不是沿用 nextPageNo。
      return load(pageNo === 1 ? 'reset' : 'next', true, pageNo);
    },
    /** 组件卸载或重建时让尚未返回的请求不再写入状态。 */
    dispose: () => {
      generation += 1;
      pending = false;
    }
  };
};

/**
 * 判定侧栏视口是否需要继续拉下一页填满：
 * 仅当已加载、非加载中、无错误、还有下一页，且视口已在底部（内容未溢出 scrollHeight <= clientHeight 也算在底部）时为 true；
 * 容器不可见或高度为 0（离屏/未布局）时必须为 false，避免离屏时把剩余页全部拉完。
 * 由组件在渲染后与容器尺寸变化时调用；是否真的发请求仍受 loadNext 的 pending/hasMore/error 守卫约束，一次只发一页。
 */
export const shouldLoadToFillViewport = (
  state: Pick<SessionListState, 'loaded' | 'loading' | 'error' | 'hasMore'>,
  metrics: ViewportMetrics | null
): boolean => {
  if (!metrics || !metrics.visible || metrics.clientHeight <= 0) return false;
  if (!state.loaded || state.loading || state.error !== null || !state.hasMore) return false;
  return (
    metrics.scrollHeight <= metrics.clientHeight || metrics.scrollTop + metrics.clientHeight >= metrics.scrollHeight
  );
};

/** 路由指向的会话若尚未加载到侧栏，用详情接口补齐（含 llmModelId，避免模型绑定被误判）。 */
export const resolveSessionForRoute = async (
  sessionId: string | null,
  loadedSessions: SessionItem[],
  fetchDetail: (sessionId: string) => Promise<SessionItem | null>
): Promise<SessionItem | null> => {
  if (!sessionId) return null;
  const matched = loadedSessions.find((item) => item.id === sessionId);
  if (matched) return matched;
  return fetchDetail(sessionId);
};
