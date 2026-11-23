import { SessionService } from './session.service';

const ENV_KEY = 'PAGINATION_MAX_PAGE_SIZE';
const savedMaxPageSize = process.env[ENV_KEY];

const rows = [
  {
    id: 'session-1',
    title: '会话一',
    llmModelId: null,
    createTime: new Date('2026-11-01T00:00:00.000Z'),
    updateTime: new Date('2026-11-01T00:00:00.000Z')
  }
];

describe('SessionService.getList 分页契约', () => {
  let findMany: jest.Mock;
  let count: jest.Mock;
  let service: SessionService;

  beforeEach(() => {
    delete process.env[ENV_KEY];
    findMany = jest.fn().mockResolvedValue(rows);
    count = jest.fn().mockResolvedValue(45);
    service = new SessionService({ session: { findMany, count } } as never);
  });

  afterAll(() => {
    if (savedMaxPageSize === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = savedMaxPageSize;
  });

  it('按 pageNo/pageSize 计算 skip/take，并返回 total 供前端判断末页', async () => {
    const result = await service.getList('user-1', 2, 20);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        orderBy: { createTime: 'desc' },
        skip: 20,
        take: 20
      })
    );
    expect(count).toHaveBeenCalledWith({ where: { userId: 'user-1' } });
    expect(result).toEqual({ list: rows, total: 45, pageNo: 2, pageSize: 20 });
  });

  it('未传分页参数时只取第一页 20 条，不会一次返回全量', async () => {
    const result = await service.getList('user-1');

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 0, take: 20 }));
    expect(result.pageNo).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it('部署配置上限时下调 pageSize 并据此计算 skip', async () => {
    process.env[ENV_KEY] = '10';

    const result = await service.getList('user-1', 3, 5000);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 20, take: 10 }));
    expect(result.pageSize).toBe(10);
  });
});
