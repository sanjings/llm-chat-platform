import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionService } from 'src/modules/session/services/session.service';
import { PrismaService } from 'src/infrastructure/database/prisma.service';
import { lowerCaseToRole, roleToLowerCase } from 'src/utils/role.utils';
import type { ResponseFormatWire } from '../dtos/chat.dto';

/** 和前端约定一致的消息结构 */
export type ChatStreamMessage = { role: string; content: string };
type ResponseFormat = ResponseFormatWire | undefined;
export type LlmProviderName = 'dashscope' | 'openai_compatible';

export type SelectableChatModel = {
  id: string;
  provider: LlmProviderName;
  available: boolean;
  unavailableReason: string | null;
};

type ResolvedLlm = { provider: LlmProviderName; model: string };
type CatalogModel = { id: string; provider: LlmProviderName; model: string };

/**
 * 仓库内正式可选目录。未配置部署覆盖时，接口返回这份列表。
 * 通义取百炼当前推荐的文本模型（不含仅 Token Plan 的预览版）；
 * DeepSeek 取 2026-07-24 停用 deepseek-chat / deepseek-reasoner 之后的现用名。
 */
const BUILTIN_DASHSCOPE_MODELS: CatalogModel[] = [
  { id: 'qwen3.8-max', provider: 'dashscope', model: 'qwen3.8-max' },
  { id: 'qwen3.7-plus', provider: 'dashscope', model: 'qwen3.7-plus' },
  { id: 'qwen3.8-flash', provider: 'dashscope', model: 'qwen3.8-flash' }
];

const BUILTIN_DEEPSEEK_MODELS: CatalogModel[] = [
  { id: 'deepseek-flash', provider: 'openai_compatible', model: 'deepseek-flash' },
  { id: 'deepseek-v4-pro', provider: 'openai_compatible', model: 'deepseek-v4-pro' }
];

const SELECTABLE_MODELS: CatalogModel[] = [...BUILTIN_DASHSCOPE_MODELS, ...BUILTIN_DEEPSEEK_MODELS];

/**
 * 某一厂商的可选列表覆盖。逗号分隔，空白项忽略，同名只保留第一次。
 * 未配置或解析后为空则返回 null，调用方继续用正式目录。
 * 名单里的 ID 可以不在正式目录中，线路由所在变量决定。
 */
const catalogFromOverride = (raw: string | undefined, provider: LlmProviderName): CatalogModel[] | null => {
  if (!raw?.trim()) return null;
  const models: CatalogModel[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(',')) {
    const id = part.trim();
    if (!id) continue;
    const key = id.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    models.push({ id, provider, model: id });
  }
  return models.length ? models : null;
};

/** 当前部署的可选列表。只覆盖已配置的那一侧，另一侧保持正式目录。 */
const resolveSelectableCatalog = (): CatalogModel[] => {
  const dashscope = catalogFromOverride(process.env.LLM_DASHSCOPE_MODELS, 'dashscope') ?? BUILTIN_DASHSCOPE_MODELS;
  const deepseek = catalogFromOverride(process.env.LLM_DEEPSEEK_MODELS, 'openai_compatible') ?? BUILTIN_DEEPSEEK_MODELS;
  return [...dashscope, ...deepseek];
};

/** 旧会话或线路别名仍能路由；不出现在可选列表里 */
const LEGACY_MODEL_MAP: Record<string, ResolvedLlm> = {
  dashscope: { provider: 'dashscope', model: 'qwen3.7-plus' },
  openai_compatible: { provider: 'openai_compatible', model: 'deepseek-flash' },
  openai: { provider: 'openai_compatible', model: 'deepseek-flash' },
  deepseek: { provider: 'openai_compatible', model: 'deepseek-flash' },
  'qwen-max': { provider: 'dashscope', model: 'qwen-max' },
  'qwen-plus': { provider: 'dashscope', model: 'qwen-plus' },
  'qwen-turbo': { provider: 'dashscope', model: 'qwen-turbo' },
  'qwen2.5-72b-instruct': { provider: 'dashscope', model: 'qwen2.5-72b-instruct' },
  'qwen2.5-32b-instruct': { provider: 'dashscope', model: 'qwen2.5-32b-instruct' },
  'deepseek-chat': { provider: 'openai_compatible', model: 'deepseek-flash' },
  'deepseek-reasoner': { provider: 'openai_compatible', model: 'deepseek-flash' }
};

const DEFAULT_DASHSCOPE_MODEL = 'qwen3.7-plus';
const DEFAULT_DEEPSEEK_MODEL = 'deepseek-flash';

const missingKeyReason = (provider: LlmProviderName) =>
  provider === 'dashscope'
    ? '未配置通义 DashScope API Key，通义模型不可选'
    : '未配置 DeepSeek API Key，DeepSeek 模型不可选';

/**
 * 把请求或会话上的模型 ID 解析成线路和上游模型名。
 * catalog 是当前部署的可选列表。未命中时仍按正式目录和旧别名路由，
 * 已绑定的模型移出可选列表后可以继续对话。
 * 其余 ID：qwen* 走 dashscope，deepseek* 走 openai_compatible，再否则用 fallback 线路。
 */
export const resolveFrontendModel = (
  modelId: string | undefined,
  fallback: ResolvedLlm,
  catalog: readonly CatalogModel[] = SELECTABLE_MODELS
): ResolvedLlm => {
  const raw = modelId?.trim();
  if (!raw) return fallback;
  const key = raw.toLowerCase();
  const fromCatalog = catalog.find((item) => item.id.toLowerCase() === key);
  if (fromCatalog) return { provider: fromCatalog.provider, model: fromCatalog.model };
  const builtin = SELECTABLE_MODELS.find((item) => item.id.toLowerCase() === key);
  if (builtin) return { provider: builtin.provider, model: builtin.model };
  const legacy = LEGACY_MODEL_MAP[key];
  if (legacy) return legacy;
  if (key.startsWith('qwen')) return { provider: 'dashscope', model: raw };
  if (key.startsWith('deepseek')) return { provider: 'openai_compatible', model: raw };
  return { provider: fallback.provider, model: raw };
};

const parsePositiveInt = (raw: string | undefined): number | null => {
  const text = raw?.trim();
  if (!text || !/^\d+$/.test(text)) return null;
  const value = Number(text);
  // 309 位全 9 会变成 Infinity；超过 MAX_SAFE_INTEGER 也会丢精度，都按非法值回退默认。
  return Number.isFinite(value) && Number.isSafeInteger(value) && value > 0 ? value : null;
};

/**
 * 生成长度按模型区分，默认值依据（约 2026-11 官方文档）：
 * - 通义 qwen[3-9]*（含部署覆盖里的 qwen3.8-27b / qwen3.8-max-0902 等）：
 *   最大输出 131072，上下文 1M。兼容模式里 max_tokens 只限制最终回答（不含思维链），
 *   默认 16384 足以覆盖常规长文/长代码，又远低于上限，成本更可控。
 *   流式请求的 120s 是已连接 socket 的空闲/无数据超时，不是整段生成总时长上限；
 *   只要流里持续有 chunk 就不会因总时长超过 120s 中断，不要为了默认 16384 调整它。
 * - DeepSeek deepseek*：最大输出 384K；开启思考时官方 max_tokens 默认 65536（含思维链+回答），
 *   关闭思考时默认 8192。本项目会对 DeepSeek 开启思考，因此显式写 65536，保持与官方默认一致。
 * - 旧通义（qwen-max / qwen-plus / qwen-turbo / qwen2.5-* 等）与未知自定义模型：
 *   官方最大输出多为 8192（如 qwen-max），保守使用 8192，避免把 16k 打到只支持 8k 输出的旧模型上报错。
 * LLM_MAX_TOKENS 为正整数时覆盖所有模型；空、0、负数、非整数忽略并回退按模型默认。
 */
export const resolveModelMaxTokens = (model: string): number => {
  const envOverride = parsePositiveInt(process.env.LLM_MAX_TOKENS);
  if (envOverride !== null) return envOverride;
  if (/^deepseek/.test(model)) return 65536;
  if (/^qwen[3-9]/.test(model)) return 16384;
  return 8192;
};

/**
 * 现代 1M 上下文模型：通义 qwen[3-9]*（与思考开关同一判断），
 * DeepSeek 当前正式目录 deepseek-flash / deepseek-v4*。
 * 默认 40 条对话、64000 字符：约 20 轮近期对话；中文 6.4 万字约为数万 token 量级，
 * 远低于 1M 窗口，并给 16k–65k 输出留余量。
 * 其余模型（qwen-max 上下文约 32k、最大输入 30720，qwen2.5 以及未知自定义 ID）
 * 默认 24 条、24000 字符：比旧默认 12/12000 更宽，又能避免 64000 汉字把旧模型输入打满。
 */
const isModernContextModel = (model: string) =>
  /^qwen[3-9]/.test(model) || model === 'deepseek-flash' || /^deepseek-v[4-9]/.test(model);

export type ContextBudget = { maxMessages: number; maxChars: number };

/**
 * 上下文预算。LLM_CONTEXT_MAX_MESSAGES / LLM_CONTEXT_MAX_CHARS 可独立覆盖所有模型的对应预算，
 * 只接受正整数；空或非法值忽略并回退按模型默认。
 */
export const resolveContextBudget = (model: string): ContextBudget => {
  const modern = isModernContextModel(model);
  return {
    maxMessages: parsePositiveInt(process.env.LLM_CONTEXT_MAX_MESSAGES) ?? (modern ? 40 : 24),
    maxChars: parsePositiveInt(process.env.LLM_CONTEXT_MAX_CHARS) ?? (modern ? 64000 : 24000)
  };
};

/**
 * 支持推理的模型打开思考。
 * 通义 qwen3+：enable_thinking。DeepSeek：thinking.type。
 * max_tokens 按模型默认，未知模型也有保守兜底，避免长回答被 2048 截断。
 */
export const buildProviderChatBody = (
  provider: LlmProviderName,
  model: string,
  messages: ChatStreamMessage[]
): Record<string, unknown> => {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((item) => ({ role: item.role, content: item.content })),
    stream: true,
    max_tokens: resolveModelMaxTokens(model)
  };
  if (provider === 'dashscope') {
    body.temperature = 0.7;
    if (/^qwen[3-9]/.test(model)) body.enable_thinking = true;
  } else if (model.startsWith('deepseek')) {
    body.thinking = { type: 'enabled' };
  }
  return body;
};

/**
 * 聊天业务：写库 + 调大模型。
 * 流式接口的细节在 Controller 里（转发 SSE、结束时把助手回复再写入数据库）。
 */
@Injectable()
export class ChatService {
  private readonly markdownSystemPrompt =
    process.env.LLM_MARKDOWN_SYSTEM_PROMPT || '请使用 Markdown 格式回答。标题、列表、代码块请按标准 Markdown 输出。';

  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly http: HttpService
  ) {}

  /** 用环境变量决定默认线路（未传 modelId，或 modelId 未命中映射时） */
  private llmProvider(): LlmProviderName {
    const p = (process.env.LLM_PROVIDER || 'dashscope').toLowerCase();
    if (p === 'openai_compatible' || p === 'openai' || p === 'deepseek') {
      return 'openai_compatible';
    }
    return 'dashscope';
  }

  /**
   * 未传 modelId 时的模型名，也是 GET /api/chat/models 的 defaultModelId。
   * LLM_MODEL 优先；不配则按 LLM_PROVIDER：通义 qwen3.7-plus，DeepSeek deepseek-flash。
   * 不另设一套默认值。可选列表被覆盖时，请把 LLM_MODEL 设成仍在列表中的 ID。
   */
  private resolveModel(explicit?: string): string {
    if (explicit?.trim()) return explicit.trim();
    if (process.env.LLM_MODEL?.trim()) return process.env.LLM_MODEL.trim();
    return this.llmProvider() === 'dashscope' ? DEFAULT_DASHSCOPE_MODEL : DEFAULT_DEEPSEEK_MODEL;
  }

  defaultModelId(): string {
    return this.resolveModel();
  }

  /** 一次请求内用哪个网关、哪个模型名 */
  private resolveLlmFromRequest(modelId?: string): ResolvedLlm {
    return resolveFrontendModel(
      modelId,
      { provider: this.llmProvider(), model: this.resolveModel() },
      resolveSelectableCatalog()
    );
  }

  /**
   * 各家密钥分开读。
   * 专有变量优先；LLM_API_KEY 只作为 LLM_PROVIDER 对应线路的兼容密钥，避免一把钥匙打到另一家。
   */
  private apiKeyFor(provider: LlmProviderName): string {
    if (provider === 'dashscope') {
      const dedicated = process.env.DASHSCOPE_API_KEY?.trim();
      if (dedicated) return dedicated;
      if (this.llmProvider() === 'dashscope') return process.env.LLM_API_KEY?.trim() || '';
      return '';
    }
    const dedicated = process.env.DEEPSEEK_API_KEY?.trim();
    if (dedicated) return dedicated;
    if (this.llmProvider() === 'openai_compatible') return process.env.LLM_API_KEY?.trim() || '';
    return '';
  }

  private resolveApiKeyFor(provider: LlmProviderName): string {
    const key = this.apiKeyFor(provider);
    if (!key) throw new BadRequestException(missingKeyReason(provider));
    return key;
  }

  /** 给新会话选择器用：只暴露当前部署的可选模型，并写明缺哪家密钥 */
  listSelectableModels(): SelectableChatModel[] {
    return resolveSelectableCatalog().map((item) => {
      const available = Boolean(this.apiKeyFor(item.provider));
      return {
        id: item.id,
        provider: item.provider,
        available,
        unavailableReason: available ? null : missingKeyReason(item.provider)
      };
    });
  }

  /**
   * 规范化上下文：
   * - 过滤空消息
   * - 最后一条必须是 user
   * - 保留全部 system + 最近 N 条对话（N 由模型预算决定）
   * - 再按总字符预算从最老对话开始裁剪，永不删除最后一条当前 user prompt
   * - system / 末尾 user 受保护，允许略超字符预算；Markdown 说明（约 44 字符）在裁剪后追加，
   *   也不回头扩大裁剪，因此最终上下文可能比预算多出这一小段。
   */
  private normalizeContext(
    messages: ChatStreamMessage[],
    budget: ContextBudget,
    responseFormat?: ResponseFormat
  ): ChatStreamMessage[] {
    const cleaned = messages
      .filter((m) => typeof m?.content === 'string' && m.content.trim())
      .map((m) => ({ role: String(m.role), content: m.content.trim() }));

    if (!cleaned.length) {
      throw new BadRequestException('messages 不能为空');
    }
    if (cleaned[cleaned.length - 1].role !== 'user') {
      throw new BadRequestException('最后一条消息必须是 user');
    }

    const systems = cleaned.filter((m) => m.role === 'system');
    const dialog = cleaned.filter((m) => m.role !== 'system');
    const recentDialog = dialog.slice(-Math.max(1, budget.maxMessages));
    const merged = [...systems, ...recentDialog];

    const totalChars = () => merged.reduce((sum, m) => sum + m.content.length, 0);
    while (totalChars() > budget.maxChars) {
      // 只删最老的非 system 对话，且不删最后一条（当前 user prompt）
      const removableIndex = merged.findIndex((m, i) => m.role !== 'system' && i < merged.length - 1);
      if (removableIndex < 0) break;
      merged.splice(removableIndex, 1);
    }

    const shouldUseMarkdown = responseFormat === 'markdown';
    const hasMarkdownSystem = merged.some((m) => m.role === 'system' && /markdown/i.test(m.content));
    if (shouldUseMarkdown && !hasMarkdownSystem) {
      merged.unshift({ role: 'system', content: this.markdownSystemPrompt });
    }

    return merged;
  }

  async sendMsg(
    userId: string,
    role: string,
    content: string,
    sessionId?: string,
    opts?: { llmModelId?: string; reasoning?: string }
  ) {
    let realSessionId = sessionId?.trim() || undefined;
    if (!realSessionId || !(await this.sessionService.existSession(realSessionId, userId))) {
      const newSession = await this.sessionService.createSession(userId, content, opts?.llmModelId);
      realSessionId = newSession.id;
    } else if (opts?.llmModelId?.trim()) {
      await this.sessionService.setSessionLlmModelIdIfNull(realSessionId, userId, opts.llmModelId.trim());
    }

    const dbRole = lowerCaseToRole(role);
    const reasoning = opts?.reasoning?.trim();
    const msg = await this.prisma.message.create({
      data: {
        sessionId: realSessionId,
        role: dbRole,
        content,
        ...(reasoning ? { reasoning } : {})
      }
    });
    return { ...msg, role: roleToLowerCase(msg.role), sessionId: realSessionId };
  }

  /**
   * 1. 解析会话绑定与模型线路，缺密钥时直接拒绝，避免先写入会话
   * 2. 按解析后的模型套用上下文预算并规范化（校验最后一条必须是 user）
   * 3. 把用户这条话写入数据库
   * 4. 向大模型发起流式请求，把 Node 可读流交给 Controller 去 pipe 给浏览器
   */
  async chatStream(
    userId: string,
    messages: ChatStreamMessage[],
    sessionId?: string,
    modelId?: string,
    responseFormat?: ResponseFormat
  ) {
    let effectiveSessionId = sessionId?.trim() || undefined;
    let boundModelId: string | null = null;
    if (effectiveSessionId) {
      const binding = await this.sessionService.findSessionForChat(userId, effectiveSessionId);
      if (!binding) {
        effectiveSessionId = undefined;
      } else {
        boundModelId = binding.llmModelId?.trim() || null;
      }
    }

    const reqModel = modelId?.trim();
    if (boundModelId && reqModel && reqModel.toLowerCase() !== boundModelId.toLowerCase()) {
      throw new BadRequestException('当前会话已绑定模型，不可切换或与绑定不一致');
    }

    const effectiveModelInput = boundModelId || reqModel || undefined;
    const { provider, model } = this.resolveLlmFromRequest(effectiveModelInput);
    const key = this.resolveApiKeyFor(provider);

    const normalizedMessages = this.normalizeContext(messages, resolveContextBudget(model), responseFormat);
    const userContent = normalizedMessages[normalizedMessages.length - 1].content;
    const persistModelId = boundModelId ? undefined : reqModel || model;

    const msg = await this.sendMsg(userId, 'user', userContent, effectiveSessionId, {
      llmModelId: persistModelId
    });
    const realSessionId = msg.sessionId;
    const stream = await this.openProviderStream(provider, model, normalizedMessages, key);
    return { stream, sessionId: realSessionId, provider };
  }

  /**
   * 通义当前模型走 DashScope 的 OpenAI 兼容接口（北京旧域名仍可用）。
   * 支持推理的通义和 DeepSeek 打开思考；思考在独立字段返回，正文仍是 content。
   */
  private async openProviderStream(
    provider: LlmProviderName,
    model: string,
    messages: ChatStreamMessage[],
    key: string
  ) {
    const base =
      provider === 'dashscope'
        ? (process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
        : (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const body = buildProviderChatBody(provider, model, messages);

    const res = await firstValueFrom(
      this.http.post(`${base}/chat/completions`, body, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`
        },
        responseType: 'stream',
        timeout: 120000
      })
    );
    return res.data as NodeJS.ReadableStream;
  }

  async saveAssistantMsg(userId: string, sessionId: string, content: string, reasoning?: string) {
    const text = content.trim();
    const thought = reasoning?.trim();
    // 有思考但没有正文时，思考也算已生成内容，要落库；两者都空才不写。
    if (!text && !thought) return;
    await this.sendMsg(userId, 'assistant', text, sessionId, thought ? { reasoning: thought } : undefined);
  }
}
