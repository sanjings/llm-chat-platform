import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createSessionListPager,
  resolveSessionForRoute,
  shouldLoadToFillViewport,
  SESSION_LIST_PAGE_SIZE,
  type SessionItem,
  type SessionPage,
  type ViewportMetrics
} from '../src/views/chat/components/Session/sessionListPaging.ts';

const makeSession = (id: string, title = id, llmModelId?: string): SessionItem => ({
  id,
  title,
  ...(llmModelId ? { llmModelId } : {}),
  createTime: '2026-11-01T00:00:00.000Z',
  updateTime: '2026-11-01T00:00:00.000Z'
});

const makeSessions = (prefix: string, from: number, to: number) =>
  Array.from({ length: to - from + 1 }, (_, index) => makeSession(`${prefix}${from + index}`));

type PageCall = { pageNo: number; pageSize: number };

test('首屏只请求有限条数，并使用总数字段判断是否还有下一页', async () => {
  const calls: PageCall[] = [];
  const all = makeSessions('s', 1, 45);
  const pager = createSessionListPager({
    fetchPage: async (pageNo, pageSize) => {
      calls.push({ pageNo, pageSize });
      return { list: all.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: all.length };
    }
  });

  await pager.reset();

  assert.equal(SESSION_LIST_PAGE_SIZE, 20);
  assert.notEqual(SESSION_LIST_PAGE_SIZE, 5000);
  assert.deepEqual(calls, [{ pageNo: 1, pageSize: SESSION_LIST_PAGE_SIZE }]);
  assert.equal(pager.getState().list.length, SESSION_LIST_PAGE_SIZE);
  assert.equal(pager.getState().total, 45);
  assert.equal(pager.getState().hasMore, true);
  assert.equal(pager.getState().nextPageNo, 2);
});

test('并发触底只发出一个下一页请求', async () => {
  const calls: number[] = [];
  let resolvePage!: (page: SessionPage) => void;
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      if (pageNo === 1) return { list: makeSessions('s', 1, 20), total: 40 };
      return new Promise<SessionPage>((resolve) => {
        resolvePage = resolve;
      });
    }
  });

  await pager.reset();
  const first = pager.loadNext();
  const second = pager.loadNext();
  assert.deepEqual(calls, [1, 2]);

  resolvePage({ list: makeSessions('s', 21, 40), total: 40 });
  await Promise.all([first, second]);

  assert.equal(pager.getState().list.length, 40);
  assert.equal(pager.getState().loading, false);
});

test('追加时按 id 去重，末页后不再发请求，滚动位置回调成对触发', async () => {
  const calls: number[] = [];
  let beforeAppend = 0;
  let afterAppend = 0;
  const pages: Record<number, SessionPage> = {
    1: { list: makeSessions('s', 1, 20), total: 43 },
    // 与上一页重叠一条，模拟 offset 分页在会话增删后的偏移。
    2: { list: makeSessions('s', 20, 39), total: 43 },
    3: { list: makeSessions('s', 40, 43), total: 43 }
  };
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      return pages[pageNo] ?? { list: [], total: 43 };
    },
    onBeforeAppend: () => {
      beforeAppend += 1;
    },
    onAfterAppend: () => {
      afterAppend += 1;
    }
  });

  await pager.reset();
  assert.equal(beforeAppend, 0);
  await pager.loadNext();
  await pager.loadNext();

  const ids = pager.getState().list.map((item) => item.id);
  assert.equal(ids.length, 43);
  assert.equal(new Set(ids).size, 43);
  assert.equal(pager.getState().hasMore, false);
  assert.equal(beforeAppend, 2);
  assert.equal(afterAppend, 2);

  await pager.loadNext();
  await pager.loadNext();
  assert.deepEqual(calls, [1, 2, 3]);
  assert.equal(beforeAppend, 2);
});

test('整页刚好用尽（末页满页）时 hasMore 为 false 并停止请求', async () => {
  const calls: number[] = [];
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      const all = makeSessions('s', 1, 40);
      return { list: all.slice((pageNo - 1) * 20, pageNo * 20), total: all.length };
    }
  });

  await pager.reset();
  assert.equal(pager.getState().hasMore, true);
  await pager.loadNext();
  assert.equal(pager.getState().list.length, 40);
  assert.equal(pager.getState().hasMore, false);
  await pager.loadNext();
  assert.deepEqual(calls, [1, 2]);
});

test('服务端返回空页时 hasMore 为 false 并停止请求', async () => {
  const calls: number[] = [];
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      // total 仍大于已加载条数，但服务端第 2 页返回空（并发删除等），必须停住避免反复空请求。
      if (pageNo === 1) return { list: makeSessions('s', 1, 20), total: 60 };
      return { list: [], total: 60 };
    }
  });

  await pager.reset();
  await pager.loadNext();
  assert.equal(pager.getState().hasMore, false);
  await pager.loadNext();
  assert.deepEqual(calls, [1, 2]);
});

test('服务端下调 pageSize 时按返回值判断末页', async () => {
  const calls: number[] = [];
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      const all = makeSessions('s', 1, 15);
      return { list: all.slice((pageNo - 1) * 10, pageNo * 10), total: all.length, pageSize: 10 };
    }
  });

  await pager.reset();
  assert.equal(pager.getState().hasMore, true);
  await pager.loadNext();
  assert.equal(pager.getState().list.length, 15);
  assert.equal(pager.getState().hasMore, false);
  await pager.loadNext();
  assert.deepEqual(calls, [1, 2]);
});

test('重置会让仍在飞行的旧页码响应失效', async () => {
  let resolveFirst!: (page: SessionPage) => void;
  let call = 0;
  const pager = createSessionListPager({
    fetchPage: async () => {
      call += 1;
      if (call === 1) {
        return new Promise<SessionPage>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return { list: [makeSession('new')], total: 1 };
    }
  });

  const stale = pager.reset();
  const fresh = pager.reset();
  resolveFirst({ list: [makeSession('old')], total: 1 });
  await Promise.all([stale, fresh]);

  assert.deepEqual(
    pager.getState().list.map((item) => item.id),
    ['new']
  );
  assert.equal(pager.getState().total, 1);
  assert.equal(pager.getState().hasMore, false);
  assert.equal(pager.getState().loading, false);
});

test('组件卸载后到达的响应不再写入列表状态', async () => {
  let resolvePage!: (page: SessionPage) => void;
  let changes = 0;
  const pager = createSessionListPager({
    fetchPage: () =>
      new Promise<SessionPage>((resolve) => {
        resolvePage = resolve;
      }),
    onChange: () => {
      changes += 1;
    }
  });

  const loading = pager.reset();
  pager.dispose();
  resolvePage({ list: makeSessions('s', 1, 20), total: 20 });
  await loading;

  assert.equal(pager.getState().list.length, 0);
  assert.equal(pager.getState().loading, true);
  assert.equal(changes, 1); // 只有进入 loading 的那次通知
});

test('失败后显示错误、阻止静默重复请求，重试同一页成功恢复', async () => {
  const calls: number[] = [];
  let failPage2 = true;
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      if (pageNo === 1) return { list: makeSessions('s', 1, 20), total: 40 };
      if (failPage2) {
        failPage2 = false;
        throw new Error('网络异常');
      }
      return { list: makeSessions('s', 21, 40), total: 40 };
    }
  });

  await pager.reset();
  await pager.loadNext();
  assert.equal(pager.getState().error, '网络异常');
  assert.equal(pager.getState().list.length, 20);

  await pager.loadNext();
  assert.deepEqual(calls, [1, 2]);

  await pager.retry();
  assert.equal(pager.getState().error, null);
  assert.equal(pager.getState().list.length, 40);
  assert.deepEqual(calls, [1, 2, 2]);
});

test('首屏失败后重试从第一页重新开始', async () => {
  let attempts = 0;
  const calls: number[] = [];
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      attempts += 1;
      if (attempts === 1) throw new Error('加载失败');
      return { list: [makeSession('s1')], total: 1 };
    }
  });

  await pager.reset();
  assert.equal(pager.getState().error, '加载失败');
  await pager.retry();
  assert.deepEqual(calls, [1, 1]);
  assert.equal(pager.getState().error, null);
  assert.equal(pager.getState().list.length, 1);
});

test('重置请求失败后重试第一页，即使旧列表仍在也不会接着拉下一页', async () => {
  const calls: number[] = [];
  let failReset = false;
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      if (pageNo === 1 && failReset) throw new Error('刷新失败');
      const all = makeSessions('s', 1, 40);
      return { list: all.slice((pageNo - 1) * 20, pageNo * 20), total: all.length };
    }
  });

  await pager.reset();
  assert.equal(pager.getState().list.length, 20);
  failReset = true;
  await pager.reset();
  assert.equal(pager.getState().error, '刷新失败');
  assert.equal(pager.getState().list.length, 20);

  failReset = false;
  await pager.retry();
  assert.deepEqual(calls, [1, 1, 1]);
  assert.equal(pager.getState().error, null);
  assert.equal(pager.getState().list.length, 20);
  assert.equal(pager.getState().hasMore, true);
});

test('新建/重命名/删除后重置回第一页，切换未加载会话时用详情补齐模型绑定', async () => {
  const sessions = new Map(makeSessions('s', 1, 20).map((item) => [item.id, item]));
  const resetCalls: PageCall[] = [];
  const pager = createSessionListPager({
    fetchPage: async (pageNo, pageSize) => {
      resetCalls.push({ pageNo, pageSize });
      return { list: [...sessions.values()].slice((pageNo - 1) * pageSize, pageNo * pageSize), total: sessions.size };
    }
  });

  await pager.reset();
  sessions.set('s2', makeSession('s2', '重命名后'));
  await pager.reset();
  assert.equal(pager.getState().list[1].title, '重命名后');

  sessions.delete('s2');
  await pager.reset();
  assert.equal(
    pager.getState().list.some((item) => item.id === 's2'),
    false
  );

  // 新建会话排在最前（createTime desc）。
  sessions.clear();
  [makeSession('s0'), ...makeSessions('s', 1, 20).filter((item) => item.id !== 's2')].forEach((item) =>
    sessions.set(item.id, item)
  );
  await pager.reset();
  assert.equal(pager.getState().list[0].id, 's0');
  assert.deepEqual(
    resetCalls,
    Array.from({ length: 4 }, () => ({ pageNo: 1, pageSize: SESSION_LIST_PAGE_SIZE }))
  );

  let detailCalls = 0;
  const loaded = pager.getState().list;
  const unloaded = await resolveSessionForRoute('s99', loaded, async (sessionId) => {
    detailCalls += 1;
    return makeSession(sessionId, '未加载会话', 'qwen3.8-max');
  });
  assert.equal(unloaded?.llmModelId, 'qwen3.8-max');
  assert.equal(detailCalls, 1);

  const loadedSession = await resolveSessionForRoute('s1', loaded, async () => {
    detailCalls += 1;
    return null;
  });
  assert.equal(loadedSession?.id, 's1');
  assert.equal(detailCalls, 1);

  assert.equal(await resolveSessionForRoute(null, loaded, async () => null), null);
});

test('整页重复 id（列表长度不变）时滚动恢复版本仍自增，回调成对触发', async () => {
  const calls: number[] = [];
  let before = 0;
  let after = 0;
  const pageOne = makeSessions('s', 1, 20);
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      // 第 2 页全是与第 1 页重复的 id（offset 漂移），list.length 不变。
      return { list: pageOne, total: 40 };
    },
    onBeforeAppend: () => {
      before += 1;
    },
    onAfterAppend: () => {
      after += 1;
    }
  });

  await pager.reset();
  assert.equal(pager.getState().scrollRestoreVersion, 0);
  await pager.loadNext();

  assert.equal(pager.getState().list.length, 20);
  assert.equal(pager.getState().scrollRestoreVersion, 1);
  assert.equal(before, 1);
  assert.equal(after, 1);

  await pager.reset();
  assert.equal(pager.getState().scrollRestoreVersion, 0);
  assert.deepEqual(calls, [1, 2, 1]);
});

test('重置后滚动恢复版本清零，且在途的旧追加响应不触发滚动回调', async () => {
  let resolvePage2!: (page: SessionPage) => void;
  let before = 0;
  let after = 0;
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      if (pageNo === 1) return { list: [makeSession('a')], total: 45 };
      return new Promise<SessionPage>((resolve) => {
        resolvePage2 = resolve;
      });
    },
    onBeforeAppend: () => {
      before += 1;
    },
    onAfterAppend: () => {
      after += 1;
    }
  });

  await pager.reset();
  const staleAppend = pager.loadNext();
  const freshReset = pager.reset();
  resolvePage2({ list: [makeSession('b')], total: 45 });
  await Promise.all([staleAppend, freshReset]);

  assert.equal(before, 0);
  assert.equal(after, 0);
  assert.deepEqual(
    pager.getState().list.map((item) => item.id),
    ['a']
  );
  assert.equal(pager.getState().scrollRestoreVersion, 0);
});

test('shouldLoadToFillViewport 仅在已加载、无错误、视口在底部且容器可见时为 true', () => {
  const ready = { loaded: true, loading: false, error: null, hasMore: true };
  const atBottom: ViewportMetrics = { visible: true, scrollHeight: 800, clientHeight: 400, scrollTop: 400 };

  assert.equal(shouldLoadToFillViewport(ready, atBottom), true);
  // 内容未溢出视口也视为在底部。
  assert.equal(shouldLoadToFillViewport(ready, { ...atBottom, scrollHeight: 400, scrollTop: 0 }), true);
  // 未到底部。
  assert.equal(shouldLoadToFillViewport(ready, { ...atBottom, scrollTop: 100 }), false);
  // 容器不可见（抽屉关闭被移出视口）或高度为 0（离屏/未布局）必须为 false。
  assert.equal(shouldLoadToFillViewport(ready, { ...atBottom, visible: false }), false);
  assert.equal(
    shouldLoadToFillViewport(ready, { visible: true, scrollHeight: 0, clientHeight: 0, scrollTop: 0 }),
    false
  );
  assert.equal(shouldLoadToFillViewport(ready, null), false);
  // 状态守卫：未加载、加载中、出错、末页都不再继续。
  assert.equal(shouldLoadToFillViewport({ ...ready, loaded: false }, atBottom), false);
  assert.equal(shouldLoadToFillViewport({ ...ready, loading: true }, atBottom), false);
  assert.equal(shouldLoadToFillViewport({ ...ready, error: '网络异常' }, atBottom), false);
  assert.equal(shouldLoadToFillViewport({ ...ready, hasMore: false }, atBottom), false);
});

/** 模拟组件的填充节奏：渲染后判定，为 true 才加载一页，加载完成后再判定。 */
const runViewportFill = async (
  pager: ReturnType<typeof createSessionListPager>,
  getMetrics: () => ViewportMetrics | null
) => {
  for (let round = 0; round < 20; round += 1) {
    if (!shouldLoadToFillViewport(pager.getState(), getMetrics())) return;
    await pager.loadNext();
  }
  throw new Error('视口填充循环没有停止');
};

test('视口未填满时逐页加载，填满后停止（剩余页不继续拉）', async () => {
  const calls: number[] = [];
  const all = makeSessions('s', 1, 60);
  const pager = createSessionListPager({
    fetchPage: async (pageNo, pageSize) => {
      calls.push(pageNo);
      return { list: all.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: all.length };
    }
  });

  await pager.reset();
  // 侧栏可视高 500px、每条 20px：第 1 页 400px 未填满，第 2 页 800px 超出视口即停。
  const getMetrics = (): ViewportMetrics => ({
    visible: true,
    scrollHeight: pager.getState().list.length * 20,
    clientHeight: 500,
    scrollTop: 0
  });

  await runViewportFill(pager, getMetrics);

  assert.deepEqual(calls, [1, 2]);
  assert.equal(pager.getState().list.length, 40);
  // 仍有剩余页，但视口已填满，不能继续拉。
  assert.equal(pager.getState().hasMore, true);
});

test('内容未溢出视口时继续加载，直到末页才停止', async () => {
  const calls: number[] = [];
  const all = makeSessions('s', 1, 30);
  const pager = createSessionListPager({
    fetchPage: async (pageNo, pageSize) => {
      calls.push(pageNo);
      return { list: all.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: all.length };
    }
  });

  await pager.reset();
  // 窗口很高（1000px）：前两页都填不满，直到末页 hasMore 为 false 才停。
  const getMetrics = (): ViewportMetrics => ({
    visible: true,
    scrollHeight: pager.getState().list.length * 20,
    clientHeight: 1000,
    scrollTop: 0
  });

  await runViewportFill(pager, getMetrics);

  assert.deepEqual(calls, [1, 2]);
  assert.equal(pager.getState().list.length, 30);
  assert.equal(pager.getState().hasMore, false);
});

test('容器高度为 0（未布局）或离屏时不会加载任何下一页', async () => {
  const calls: number[] = [];
  const all = makeSessions('s', 1, 45);
  const pager = createSessionListPager({
    fetchPage: async (pageNo, pageSize) => {
      calls.push(pageNo);
      return { list: all.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: all.length };
    }
  });

  await pager.reset();
  assert.deepEqual(calls, [1]);

  // 未布局（高度 0）与离屏（不可见）都必须停住，不能把剩余页全部拉完。
  await runViewportFill(pager, () => ({ visible: true, scrollHeight: 0, clientHeight: 0, scrollTop: 0 }));
  await runViewportFill(pager, () => ({ visible: false, scrollHeight: 400, clientHeight: 400, scrollTop: 400 }));

  assert.deepEqual(calls, [1]);
  assert.equal(pager.getState().hasMore, true);
});

test('填充过程中出错即停止，不会自动重试或继续拉后续页', async () => {
  const calls: number[] = [];
  const all = makeSessions('s', 1, 45);
  const pager = createSessionListPager({
    fetchPage: async (pageNo, pageSize) => {
      calls.push(pageNo);
      if (pageNo === 2) throw new Error('网络异常');
      return { list: all.slice((pageNo - 1) * pageSize, pageNo * pageSize), total: all.length };
    }
  });

  await pager.reset();
  const getMetrics = (): ViewportMetrics => ({
    visible: true,
    scrollHeight: pager.getState().list.length * 20,
    clientHeight: 500,
    scrollTop: 0
  });

  await runViewportFill(pager, getMetrics);

  assert.deepEqual(calls, [1, 2]);
  assert.equal(pager.getState().error, '网络异常');

  // 错误态下再判定仍为 false，重试只能由用户点击错误行触发。
  await runViewportFill(pager, getMetrics);
  assert.deepEqual(calls, [1, 2]);
});

test('首屏失败后连续两次 retry 只发出一个请求', async () => {
  const calls: number[] = [];
  let attempts = 0;
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      attempts += 1;
      if (attempts === 1) throw new Error('加载失败');
      return { list: [makeSession('s1')], total: 1 };
    }
  });

  await pager.reset();
  assert.equal(pager.getState().error, '加载失败');

  const first = pager.retry();
  const second = pager.retry();
  // 第二次 retry 因 pending 直接返回，不产生并发请求。
  assert.deepEqual(calls, [1, 1]);
  await Promise.all([first, second]);

  assert.deepEqual(calls, [1, 1]);
  assert.equal(pager.getState().error, null);
  assert.equal(pager.getState().list.length, 1);
});

test('后续页失败后连续两次 retry 只发出一个请求', async () => {
  const calls: number[] = [];
  let failPage2 = true;
  const pager = createSessionListPager({
    fetchPage: async (pageNo) => {
      calls.push(pageNo);
      if (pageNo === 1) return { list: makeSessions('s', 1, 20), total: 40 };
      if (failPage2) {
        failPage2 = false;
        throw new Error('网络异常');
      }
      return { list: makeSessions('s', 21, 40), total: 40 };
    }
  });

  await pager.reset();
  await pager.loadNext();
  assert.equal(pager.getState().error, '网络异常');

  const first = pager.retry();
  const second = pager.retry();
  assert.deepEqual(calls, [1, 2, 2]);
  await Promise.all([first, second]);

  assert.deepEqual(calls, [1, 2, 2]);
  assert.equal(pager.getState().error, null);
  assert.equal(pager.getState().list.length, 40);
});
