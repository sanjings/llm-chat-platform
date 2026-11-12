import { ChatService, buildProviderChatBody, resolveFrontendModel } from './chat.services';

const ENV_KEYS = ['LLM_PROVIDER', 'LLM_API_KEY', 'LLM_MODEL', 'DASHSCOPE_API_KEY', 'DEEPSEEK_API_KEY'] as const;

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

  it('lists current official model ids', () => {
    clearLlmEnv();
    const ids = service()
      .listSelectableModels()
      .map((item) => item.id);
    expect(ids).toEqual(['qwen3.8-max', 'qwen3.7-plus', 'qwen3.8-flash', 'deepseek-flash', 'deepseek-v4-pro']);
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
});
