import { of } from 'rxjs';
import { ChatController } from '../controllers/chat.controller';
import {
  ChatService,
  buildProviderChatBody,
  resolveContextBudget,
  resolveFrontendModel,
  resolveModelMaxTokens
} from './chat.services';

const ENV_KEYS = [
  'LLM_PROVIDER',
  'LLM_API_KEY',
  'LLM_MODEL',
  'DASHSCOPE_API_KEY',
  'DEEPSEEK_API_KEY',
  'LLM_DASHSCOPE_MODELS',
  'LLM_DEEPSEEK_MODELS',
  'LLM_MAX_TOKENS',
  'LLM_CONTEXT_MAX_MESSAGES',
  'LLM_CONTEXT_MAX_CHARS'
] as const;

const OFFICIAL_MODEL_IDS = ['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash', 'deepseek-flash', 'deepseek-v4-pro'];

const snapshotEnv = () => {
  const saved: Partial<Record<(typeof ENV_KEYS)[number], string | undefined>> = {};
  for (const key of ENV_KEYS) saved[key] = process.env[key];
  return saved;
};

const restoreEnv = (saved: ReturnType<typeof snapshotEnv>) => {
  for (const key of ENV_KEYS) {
    const value = saved[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
};

const clearLlmEnv = () => {
  for (const key of ENV_KEYS) delete process.env[key];
};

describe('chat model routing', () => {
  const saved = snapshotEnv();

  afterEach(() => {
    restoreEnv(saved);
  });

  const service = () => new ChatService({} as never, {} as never, {} as never);

  it('lists the built-in catalog and default model when no override is set', () => {
    clearLlmEnv();
    const body = new ChatController(service()).listModels();
    expect(body.defaultModelId).toBe('qwen3.7-plus');
    expect(body.models.map((item) => item.id)).toEqual(OFFICIAL_MODEL_IDS);
    expect(body.models.map((item) => item.provider)).toEqual([
      'dashscope',
      'dashscope',
      'dashscope',
      'openai_compatible',
      'openai_compatible'
    ]);
  });

  it('enables only the provider whose key is configured', () => {
    clearLlmEnv();
    process.env.LLM_PROVIDER = 'dashscope';
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';

    const models = service().listSelectableModels();
    const qwen = models.find((item) => item.id === 'qwen3.7-plus');
    const deepseek = models.find((item) => item.id === 'deepseek-flash');

    expect(qwen?.available).toBe(true);
    expect(qwen?.unavailableReason).toBeNull();
    expect(deepseek?.available).toBe(false);
    expect(deepseek?.unavailableReason).toContain('DeepSeek API Key');
    expect(deepseek?.unavailableReason).not.toContain('暂未开放');
  });

  it('uses LLM_API_KEY only for the default provider', () => {
    clearLlmEnv();
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.LLM_API_KEY = 'deepseek-key';

    const models = service().listSelectableModels();
    expect(models.find((item) => item.id === 'deepseek-v4-pro')?.available).toBe(true);
    expect(models.find((item) => item.id === 'qwen3.8-max')?.available).toBe(false);
    expect(models.find((item) => item.id === 'qwen3.8-max')?.unavailableReason).toContain('通义 DashScope');
  });

  it('allows both providers when both dedicated keys exist', () => {
    clearLlmEnv();
    process.env.LLM_PROVIDER = 'dashscope';
    process.env.LLM_API_KEY = 'dashscope-default';
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.DEEPSEEK_API_KEY = 'deepseek-key';

    const models = service().listSelectableModels();
    expect(models.every((item) => item.available)).toBe(true);
  });

  it('maps selectable and legacy model ids onto the right upstream', () => {
    expect(resolveFrontendModel('qwen3.7-plus', { provider: 'openai_compatible', model: 'deepseek-flash' })).toEqual({
      provider: 'dashscope',
      model: 'qwen3.7-plus'
    });
    expect(resolveFrontendModel('deepseek-v4-pro', { provider: 'dashscope', model: 'qwen3.7-plus' })).toEqual({
      provider: 'openai_compatible',
      model: 'deepseek-v4-pro'
    });
    expect(resolveFrontendModel('deepseek-chat', { provider: 'dashscope', model: 'qwen3.7-plus' })).toEqual({
      provider: 'openai_compatible',
      model: 'deepseek-flash'
    });
    expect(resolveFrontendModel('qwen-max', { provider: 'openai_compatible', model: 'deepseek-flash' })).toEqual({
      provider: 'dashscope',
      model: 'qwen-max'
    });
    expect(resolveFrontendModel('custom-model', { provider: 'dashscope', model: 'qwen3.7-plus' })).toEqual({
      provider: 'dashscope',
      model: 'custom-model'
    });
    expect(resolveFrontendModel(undefined, { provider: 'dashscope', model: 'qwen3.7-plus' })).toEqual({
      provider: 'dashscope',
      model: 'qwen3.7-plus'
    });
    expect(resolveFrontendModel('qwen3.8-27b', { provider: 'openai_compatible', model: 'deepseek-flash' })).toEqual({
      provider: 'dashscope',
      model: 'qwen3.8-27b'
    });
    expect(resolveFrontendModel('deepseek-custom', { provider: 'dashscope', model: 'qwen3.7-plus' })).toEqual({
      provider: 'openai_compatible',
      model: 'deepseek-custom'
    });
    expect(
      resolveFrontendModel('qwen3.7-plus', { provider: 'openai_compatible', model: 'deepseek-flash' }, [
        { id: 'qwen3.8-flash', provider: 'dashscope', model: 'qwen3.8-flash' }
      ])
    ).toEqual({ provider: 'dashscope', model: 'qwen3.7-plus' });
    expect(
      resolveFrontendModel('deepseek-chat', { provider: 'dashscope', model: 'qwen3.7-plus' }, [
        { id: 'deepseek-chat', provider: 'openai_compatible', model: 'deepseek-chat' }
      ])
    ).toEqual({ provider: 'openai_compatible', model: 'deepseek-chat' });
  });

  it('enables thinking only for reasoning models and keeps the previous request shape', () => {
    clearLlmEnv();
    const messages = [{ role: 'user', content: '你好' }];

    expect(buildProviderChatBody('dashscope', 'qwen3.7-plus', messages)).toEqual({
      model: 'qwen3.7-plus',
      messages,
      stream: true,
      max_tokens: 16384,
      temperature: 0.7,
      enable_thinking: true
    });
    expect(buildProviderChatBody('dashscope', 'qwen3.8-max', messages).enable_thinking).toBe(true);
    expect(buildProviderChatBody('dashscope', 'qwen3.8-flash', messages).enable_thinking).toBe(true);

    const legacyQwen = buildProviderChatBody('dashscope', 'qwen-max', messages);
    expect(legacyQwen).toMatchObject({ temperature: 0.7, max_tokens: 8192, stream: true });
    expect(legacyQwen).not.toHaveProperty('enable_thinking');
    expect(buildProviderChatBody('dashscope', 'qwen2.5-72b-instruct', messages)).not.toHaveProperty('enable_thinking');

    expect(buildProviderChatBody('openai_compatible', 'deepseek-v4-pro', messages)).toEqual({
      model: 'deepseek-v4-pro',
      messages,
      stream: true,
      max_tokens: 65536,
      thinking: { type: 'enabled' }
    });
    expect(buildProviderChatBody('openai_compatible', 'deepseek-flash', messages).thinking).toEqual({
      type: 'enabled'
    });

    const plain = buildProviderChatBody('openai_compatible', 'gpt-4o-mini', messages);
    expect(plain).toEqual({ model: 'gpt-4o-mini', messages, stream: true, max_tokens: 8192 });
    expect(plain).not.toHaveProperty('thinking');
    expect(plain).not.toHaveProperty('enable_thinking');
  });

  it('uses per-model default max tokens, including unknown custom models', () => {
    clearLlmEnv();

    expect(resolveModelMaxTokens('qwen3.8-max')).toBe(16384);
    expect(resolveModelMaxTokens('qwen3.7-plus')).toBe(16384);
    expect(resolveModelMaxTokens('qwen3.8-flash')).toBe(16384);
    expect(resolveModelMaxTokens('qwen3.8-27b')).toBe(16384);
    expect(resolveModelMaxTokens('qwen3.8-max-0902')).toBe(16384);
    expect(resolveModelMaxTokens('deepseek-flash')).toBe(65536);
    expect(resolveModelMaxTokens('deepseek-v4-pro')).toBe(65536);
    expect(resolveModelMaxTokens('deepseek-custom')).toBe(65536);
    expect(resolveModelMaxTokens('qwen-max')).toBe(8192);
    expect(resolveModelMaxTokens('qwen2.5-72b-instruct')).toBe(8192);
    expect(resolveModelMaxTokens('custom-model')).toBe(8192);
  });

  it('lets LLM_MAX_TOKENS override every model and ignores invalid values', () => {
    clearLlmEnv();
    process.env.LLM_MAX_TOKENS = '12345';

    expect(resolveModelMaxTokens('qwen3.8-max')).toBe(12345);
    expect(resolveModelMaxTokens('deepseek-v4-pro')).toBe(12345);
    expect(resolveModelMaxTokens('qwen-max')).toBe(12345);

    process.env.LLM_MAX_TOKENS = 'abc';
    expect(resolveModelMaxTokens('qwen3.8-max')).toBe(16384);
    process.env.LLM_MAX_TOKENS = '0';
    expect(resolveModelMaxTokens('qwen3.8-max')).toBe(16384);
    process.env.LLM_MAX_TOKENS = '-1';
    expect(resolveModelMaxTokens('qwen3.8-max')).toBe(16384);
    process.env.LLM_MAX_TOKENS = '1.5';
    expect(resolveModelMaxTokens('qwen3.8-max')).toBe(16384);
  });

  it('keeps the built-in default when the list is overridden but LLM_MODEL is unset', () => {
    clearLlmEnv();
    process.env.LLM_PROVIDER = 'deepseek';
    process.env.LLM_DASHSCOPE_MODELS = 'qwen3.8-27b,qwen3.8-flash';
    const body = new ChatController(service()).listModels();
    expect(body.defaultModelId).toBe('deepseek-flash');
    expect(body.models.map((item) => item.id)).toEqual([
      'qwen3.8-27b',
      'qwen3.8-flash',
      'deepseek-flash',
      'deepseek-v4-pro'
    ]);
  });

  it('returns the overridden Tongyi list and LLM_MODEL as the default', () => {
    clearLlmEnv();
    process.env.LLM_PROVIDER = 'dashscope';
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.LLM_DASHSCOPE_MODELS = ' qwen3.8-27b, qwen3.8-flash, qwen3.8-27b ,qwen3.8-max-0902 ';
    process.env.LLM_MODEL = 'qwen3.8-flash';

    const body = new ChatController(service()).listModels();
    expect(body.defaultModelId).toBe('qwen3.8-flash');
    expect(body.models.map((item) => item.id)).toEqual([
      'qwen3.8-27b',
      'qwen3.8-flash',
      'qwen3.8-max-0902',
      'deepseek-flash',
      'deepseek-v4-pro'
    ]);
    expect(body.models.map((item) => item.provider)).toEqual([
      'dashscope',
      'dashscope',
      'dashscope',
      'openai_compatible',
      'openai_compatible'
    ]);

    const flash = body.models.find((item) => item.id === 'qwen3.8-flash');
    const deepseek = body.models.find((item) => item.id === 'deepseek-v4-pro');
    expect(flash?.available).toBe(true);
    expect(flash?.unavailableReason).toBeNull();
    expect(deepseek?.available).toBe(false);
    expect(deepseek?.unavailableReason).toContain('DeepSeek API Key');
  });

  it('replaces only the DeepSeek list when that override is set', () => {
    clearLlmEnv();
    process.env.LLM_DEEPSEEK_MODELS = 'deepseek-chat';
    const models = service().listSelectableModels();
    expect(models.map((item) => item.id)).toEqual(['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash', 'deepseek-chat']);
    expect(models.find((item) => item.id === 'deepseek-chat')?.provider).toBe('openai_compatible');
  });

  it('treats blank override variables as unset', () => {
    clearLlmEnv();
    process.env.LLM_DASHSCOPE_MODELS = ' , ';
    process.env.LLM_DEEPSEEK_MODELS = '';
    expect(
      service()
        .listSelectableModels()
        .map((item) => item.id)
    ).toEqual(OFFICIAL_MODEL_IDS);
    expect(service().defaultModelId()).toBe('qwen3.7-plus');
  });

  const createStreamChat = (boundModelId: string | null) => {
    const http = { post: jest.fn(() => of({ data: { on() {} } })) };
    const sessionService = {
      findSessionForChat: jest.fn(async () =>
        boundModelId === null ? { llmModelId: null } : { llmModelId: boundModelId }
      ),
      existSession: jest.fn(async () => boundModelId !== null),
      createSession: jest.fn(async () => ({ id: 'created-session' })),
      setSessionLlmModelIdIfNull: jest.fn(async () => undefined)
    };
    const prisma = {
      message: {
        create: jest.fn(async ({ data }: { data: { sessionId: string; role: 'USER'; content: string } }) => ({
          id: 'msg-1',
          sessionId: data.sessionId,
          role: data.role,
          content: data.content
        }))
      }
    };
    const chat = new ChatService(sessionService as never, prisma as never, http as never);
    return { chat, http, sessionService };
  };

  type SentChatBody = {
    model: string;
    messages: { role: string; content: string }[];
    max_tokens: number;
  };

  const sentBody = (http: { post: jest.Mock }): SentChatBody => http.post.mock.calls[0][1] as SentChatBody;

  const dialogMessages = (count: number, content: (index: number) => string) =>
    Array.from({ length: count }, (_, index) => ({
      role: index === count - 1 ? 'user' : 'assistant',
      content: content(index)
    }));

  it('selects context budgets by model and lets env override each limit independently', () => {
    clearLlmEnv();

    expect(resolveContextBudget('qwen3.8-max')).toEqual({ maxMessages: 40, maxChars: 64000 });
    expect(resolveContextBudget('qwen3.8-27b')).toEqual({ maxMessages: 40, maxChars: 64000 });
    expect(resolveContextBudget('qwen3.8-max-0902')).toEqual({ maxMessages: 40, maxChars: 64000 });
    expect(resolveContextBudget('deepseek-flash')).toEqual({ maxMessages: 40, maxChars: 64000 });
    expect(resolveContextBudget('deepseek-v4-pro')).toEqual({ maxMessages: 40, maxChars: 64000 });
    expect(resolveContextBudget('qwen-max')).toEqual({ maxMessages: 24, maxChars: 24000 });
    expect(resolveContextBudget('qwen2.5-72b-instruct')).toEqual({ maxMessages: 24, maxChars: 24000 });
    expect(resolveContextBudget('custom-model')).toEqual({ maxMessages: 24, maxChars: 24000 });

    process.env.LLM_CONTEXT_MAX_MESSAGES = '7';
    expect(resolveContextBudget('qwen3.8-max')).toEqual({ maxMessages: 7, maxChars: 64000 });

    process.env.LLM_CONTEXT_MAX_CHARS = '9000';
    expect(resolveContextBudget('qwen-max')).toEqual({ maxMessages: 7, maxChars: 9000 });

    process.env.LLM_CONTEXT_MAX_MESSAGES = '0';
    process.env.LLM_CONTEXT_MAX_CHARS = '-2';
    expect(resolveContextBudget('qwen3.8-max')).toEqual({ maxMessages: 40, maxChars: 64000 });
    expect(resolveContextBudget('custom-model')).toEqual({ maxMessages: 24, maxChars: 24000 });
  });

  it('keeps all dialog messages when within the modern model default budget', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    const { chat, http } = createStreamChat(null);

    await chat.chatStream(
      'user-1',
      dialogMessages(30, (index) => `m${index}`),
      undefined,
      'qwen3.8-max'
    );

    expect(sentBody(http).messages).toHaveLength(30);
    expect(sentBody(http).max_tokens).toBe(16384);
  });

  it('keeps all system messages and only the latest 40 dialog messages for modern models', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    const { chat, http } = createStreamChat(null);
    const messages = [
      { role: 'system', content: 'system-a' },
      { role: 'system', content: 'system-b' },
      ...dialogMessages(46, (index) => `m${index}`)
    ];

    await chat.chatStream('user-1', messages, undefined, 'qwen3.8-max');

    const sent = sentBody(http).messages;
    const dialog = sent.filter((item) => item.role !== 'system');
    expect(sent.filter((item) => item.role === 'system').map((item) => item.content)).toEqual(['system-a', 'system-b']);
    expect(dialog).toHaveLength(40);
    expect(dialog[dialog.length - 1].content).toBe('m45');
    expect(sent.some((item) => item.content === 'm0')).toBe(false);
  });

  it('applies the narrower context budget to legacy models', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    const { chat, http } = createStreamChat(null);

    await chat.chatStream(
      'user-1',
      dialogMessages(30, (index) => `m${index}`),
      undefined,
      'qwen-max'
    );

    expect(sentBody(http).messages).toHaveLength(24);
    expect(sentBody(http).max_tokens).toBe(8192);
  });

  it('trims characters from the oldest dialog and never removes the final user prompt', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    const { chat, http } = createStreamChat(null);
    const pad = (prefix: string) => prefix + 'x'.repeat(3000 - prefix.length);

    await chat.chatStream(
      'user-1',
      dialogMessages(30, (index) => pad(`m${index}`)),
      undefined,
      'qwen3.8-max'
    );

    const sent = sentBody(http).messages;
    expect(sent.reduce((sum, item) => sum + item.content.length, 0)).toBeLessThanOrEqual(64000);
    expect(sent).toHaveLength(21);
    expect(sent[sent.length - 1].content).toBe(pad('m29'));
    expect(sent.some((item) => item.content === pad('m0'))).toBe(false);
  });

  it('keeps the dialog when total characters exactly hit the budget', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    const { chat, http } = createStreamChat(null);
    const messages = [
      { role: 'system', content: 's'.repeat(30000) },
      { role: 'user', content: 'u'.repeat(34000) }
    ];

    await chat.chatStream('user-1', messages, undefined, 'qwen3.8-max');

    expect(sentBody(http).messages).toHaveLength(2);
  });

  it('stops trimming when only system and the final user prompt remain', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.LLM_CONTEXT_MAX_CHARS = '100';
    const { chat, http } = createStreamChat(null);
    const messages = [
      { role: 'system', content: 's'.repeat(80) },
      { role: 'user', content: 'u'.repeat(80) }
    ];

    await chat.chatStream('user-1', messages, undefined, 'qwen3.8-max');

    const sent = sentBody(http).messages;
    expect(sent).toHaveLength(2);
    expect(sent[0].role).toBe('system');
    expect(sent[1]).toEqual({ role: 'user', content: 'u'.repeat(80) });
  });

  it('applies LLM_CONTEXT_MAX_MESSAGES from env to the request payload', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.LLM_CONTEXT_MAX_MESSAGES = '2';
    const { chat, http } = createStreamChat(null);

    await chat.chatStream(
      'user-1',
      dialogMessages(5, (index) => `m${index}`),
      undefined,
      'qwen-max'
    );

    const sent = sentBody(http).messages;
    expect(sent).toHaveLength(2);
    expect(sent[1]).toEqual({ role: 'user', content: 'm4' });
  });

  it('calls dashscope for an override model that is not in the built-in catalog', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.LLM_DASHSCOPE_MODELS = 'qwen3.8-27b,qwen3.8-flash,qwen3.8-max-0902';
    process.env.LLM_MODEL = 'qwen3.8-flash';

    const { chat, http, sessionService } = createStreamChat(null);
    await chat.chatStream('user-1', [{ role: 'user', content: '你好' }], undefined, 'qwen3.8-27b');

    expect(sessionService.createSession).toHaveBeenCalledWith('user-1', '你好', 'qwen3.8-27b');
    expect(http.post).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      expect.objectContaining({ model: 'qwen3.8-27b', stream: true, enable_thinking: true }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer dashscope-key' })
      })
    );
  });

  it('continues a session bound to a model that is no longer selectable', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.LLM_DASHSCOPE_MODELS = 'qwen3.8-27b,qwen3.8-flash,qwen3.8-max-0902';
    process.env.LLM_MODEL = 'qwen3.8-flash';

    const { chat, http, sessionService } = createStreamChat('qwen3.7-plus');
    expect(chat.listSelectableModels().map((item) => item.id)).not.toContain('qwen3.7-plus');

    const result = await chat.chatStream('user-1', [{ role: 'user', content: '继续' }], 'session-1', 'qwen3.7-plus');

    expect(result.provider).toBe('dashscope');
    expect(result.sessionId).toBe('session-1');
    expect(sessionService.createSession).not.toHaveBeenCalled();
    expect(sessionService.setSessionLlmModelIdIfNull).not.toHaveBeenCalled();
    expect(http.post).toHaveBeenCalledWith(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      expect.objectContaining({ model: 'qwen3.7-plus', stream: true }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer dashscope-key' })
      })
    );
  });

  it('still rejects a model switch on a session bound outside the current list', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';
    process.env.LLM_DASHSCOPE_MODELS = 'qwen3.8-flash';

    const { chat, http } = createStreamChat('qwen3.7-plus');
    await expect(
      chat.chatStream('user-1', [{ role: 'user', content: '再问一句' }], 'session-1', 'qwen3.8-flash')
    ).rejects.toThrow('当前会话已绑定模型');
    expect(http.post).not.toHaveBeenCalled();
  });

  it('keeps routing a bound non-catalog qwen model after the override is removed', async () => {
    clearLlmEnv();
    process.env.DASHSCOPE_API_KEY = 'dashscope-key';

    const { chat, http } = createStreamChat('qwen3.8-27b');
    expect(chat.listSelectableModels().map((item) => item.id)).toEqual(OFFICIAL_MODEL_IDS);

    await chat.chatStream('user-1', [{ role: 'user', content: '继续' }], 'session-1', 'qwen3.8-27b');
    expect(http.post).toHaveBeenCalledWith(
      expect.stringContaining('dashscope.aliyuncs.com'),
      expect.objectContaining({ model: 'qwen3.8-27b' }),
      expect.any(Object)
    );
  });
});
