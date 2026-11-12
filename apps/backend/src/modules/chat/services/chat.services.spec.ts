import { of } from 'rxjs';
import { ChatController } from '../controllers/chat.controller';
import { ChatService, buildProviderChatBody, resolveFrontendModel } from './chat.services';

const ENV_KEYS = [
  'LLM_PROVIDER',
  'LLM_API_KEY',
  'LLM_MODEL',
  'DASHSCOPE_API_KEY',
  'DEEPSEEK_API_KEY',
  'LLM_DASHSCOPE_MODELS',
  'LLM_DEEPSEEK_MODELS'
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
    const messages = [{ role: 'user', content: '你好' }];

    expect(buildProviderChatBody('dashscope', 'qwen3.7-plus', messages)).toEqual({
      model: 'qwen3.7-plus',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
      enable_thinking: true
    });
    expect(buildProviderChatBody('dashscope', 'qwen3.8-max', messages).enable_thinking).toBe(true);
    expect(buildProviderChatBody('dashscope', 'qwen3.8-flash', messages).enable_thinking).toBe(true);

    const legacyQwen = buildProviderChatBody('dashscope', 'qwen-max', messages);
    expect(legacyQwen).toMatchObject({ temperature: 0.7, max_tokens: 2048, stream: true });
    expect(legacyQwen).not.toHaveProperty('enable_thinking');
    expect(buildProviderChatBody('dashscope', 'qwen2.5-72b-instruct', messages)).not.toHaveProperty('enable_thinking');

    expect(buildProviderChatBody('openai_compatible', 'deepseek-v4-pro', messages)).toEqual({
      model: 'deepseek-v4-pro',
      messages,
      stream: true,
      thinking: { type: 'enabled' }
    });
    expect(buildProviderChatBody('openai_compatible', 'deepseek-flash', messages).thinking).toEqual({
      type: 'enabled'
    });

    const plain = buildProviderChatBody('openai_compatible', 'gpt-4o-mini', messages);
    expect(plain).toEqual({ model: 'gpt-4o-mini', messages, stream: true });
    expect(plain).not.toHaveProperty('thinking');
    expect(plain).not.toHaveProperty('enable_thinking');
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
