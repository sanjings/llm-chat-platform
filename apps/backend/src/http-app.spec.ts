import { Body, Controller, Module, Post } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import request from 'supertest';
import { JSON_BODY_LIMIT_BYTES, configureHttpApp, createHttpApp } from './http-app';

/** NestJS 11 platform-express 默认 body-parser 上限：100 * 1024 字节。 */
const OLD_DEFAULT_BODY_LIMIT_BYTES = 100 * 1024;

type ProbeMessage = { role: string; content: string };

type ProbeBody = {
  messages?: ProbeMessage[];
  sessionId?: string;
  modelId?: string;
  responseFormat?: string;
  [key: string]: unknown;
};

let handlerCalls = 0;
let lastBody: ProbeBody | undefined;

@Controller('probe')
class ProbeController {
  @Post()
  probe(@Body() body: ProbeBody) {
    handlerCalls += 1;
    lastBody = body;
    return { ok: true, messageCount: body.messages?.length ?? null };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

/** 与前端 ChatDto 同形状的请求体。 */
const frontendPayload = (messages: ProbeMessage[]) => ({
  messages,
  sessionId: 'probe-session',
  modelId: 'qwen3.8-max',
  responseFormat: 'markdown'
});

const jsonBytes = (payload: unknown) => Buffer.byteLength(JSON.stringify(payload), 'utf8');

/** 断言请求超过旧的 100kb 默认上限、仍在 1mb 上限内，并且真的进入了 handler。 */
const expectDelivered = async (payload: unknown) => {
  const size = jsonBytes(payload);
  expect(size).toBeGreaterThan(OLD_DEFAULT_BODY_LIMIT_BYTES);
  expect(size).toBeLessThanOrEqual(JSON_BODY_LIMIT_BYTES);

  const res = await request(app.getHttpServer()).post('/api/probe').send(payload).expect(201);

  expect(res.body).toEqual({ ok: true, messageCount: (payload as ProbeBody).messages?.length });
  expect(handlerCalls).toBe(1);
  return size;
};

let app: NestExpressApplication;

beforeAll(async () => {
  app = await createHttpApp(ProbeModule);
  app.useLogger(false);
  configureHttpApp(app);
  await app.init();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  handlerCalls = 0;
  lastBody = undefined;
});

describe('HTTP request body limit', () => {
  it('accepts the 120000-character ASCII frontend payload above the old 100kb default', async () => {
    const content = 'a'.repeat(120000);
    const payload = frontendPayload([{ role: 'user', content }]);

    const size = await expectDelivered(payload);

    expect(size).toBeGreaterThan(120000);
    expect(lastBody?.messages?.[0].content).toHaveLength(120000);
  });

  it('accepts 40000 Chinese characters (UTF-8 multi-byte) above the old 100kb default', async () => {
    const content = '你'.repeat(40000);
    const payload = frontendPayload([{ role: 'user', content }]);

    const size = await expectDelivered(payload);

    expect(Buffer.byteLength(content, 'utf8')).toBe(120000);
    expect(size).toBeGreaterThan(Buffer.byteLength(content, 'utf8'));
    expect(lastBody?.messages?.[0].content).toBe(content);
  });

  it('accepts 40 × 1600 Chinese characters (about 193KB) for the modern default budget', async () => {
    const payload = frontendPayload(
      Array.from({ length: 40 }, (_, index) => ({
        role: index === 39 ? 'user' : 'assistant',
        content: '你'.repeat(1600)
      }))
    );

    const size = await expectDelivered(payload);

    expect(size).toBeGreaterThan(193000);
    expect(lastBody?.messages).toHaveLength(40);
    expect(lastBody?.messages?.[39].content).toHaveLength(1600);
  });

  it('accepts 80 × 1500 Chinese characters (about 362KB), the frontend transfer cap', async () => {
    const payload = frontendPayload(
      Array.from({ length: 80 }, (_, index) => ({
        role: index === 79 ? 'user' : 'assistant',
        content: '你'.repeat(1500)
      }))
    );

    const size = await expectDelivered(payload);

    expect(size).toBeGreaterThan(362000);
    expect(lastBody?.messages).toHaveLength(80);
    expect(lastBody?.messages?.[79].content).toHaveLength(1500);
  });

  it('parses JSON quote-escaping overhead and still stays under the 1mb limit', async () => {
    const content = '你"'.repeat(25000); // 50000 JS 字符；JSON 里每个引号变成 \"，体积比原文更大
    const payload = frontendPayload([{ role: 'user', content }]);
    const escapedContentBytes = Buffer.byteLength(JSON.stringify(content), 'utf8');

    expect(escapedContentBytes).toBeGreaterThan(Buffer.byteLength(content, 'utf8'));
    expect(escapedContentBytes).toBeGreaterThan(OLD_DEFAULT_BODY_LIMIT_BYTES);

    const size = await expectDelivered(payload);

    expect(size).toBeGreaterThan(escapedContentBytes);
    expect(lastBody?.messages?.[0].content).toBe(content);
  });

  it('accepts an oversized-by-the-old-default urlencoded body with the same 1mb limit', async () => {
    const blob = 'a'.repeat(120000);

    const res = await request(app.getHttpServer()).post('/api/probe').type('form').send({ blob }).expect(201);

    expect(res.body).toEqual({ ok: true, messageCount: null });
    expect(handlerCalls).toBe(1);
    expect((lastBody as unknown as { blob: string }).blob).toBe(blob);
  });

  it('rejects a payload larger than 1mb with 413 before the handler runs', async () => {
    const payload = frontendPayload([{ role: 'user', content: 'a'.repeat(JSON_BODY_LIMIT_BYTES) }]);
    const size = jsonBytes(payload);

    expect(size).toBeGreaterThan(JSON_BODY_LIMIT_BYTES);

    await request(app.getHttpServer()).post('/api/probe').send(payload).expect(413);

    expect(handlerCalls).toBe(0);
    expect(lastBody).toBeUndefined();
  });
});
