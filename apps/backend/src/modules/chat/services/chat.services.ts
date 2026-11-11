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

/**
 * 新会话可选模型。id 与上游官方模型名一致。
 * 通义取百炼当前推荐的文本模型（不含仅 Token Plan 的预览版）；
 * DeepSeek 取 2026-07-24 停用 deepseek-chat / deepseek-reasoner 之后的现用名。
 */
const SELECTABLE_MODELS: Array<{ id: string; provider: LlmProviderName; model: string }> = [
  { id: 'qwen3.8-max', provider: 'dashscope', model: 'qwen3.8-max' },
  { id: 'qwen3.7-plus', provider: 'dashscope', model: 'qwen3.7-plus' },
  { id: 'qwen3.8-flash', provider: 'dashscope', model: 'qwen3.8-flash' },
  { id: 'deepseek-flash', provider: 'openai_compatible', model: 'deepseek-flash' },
  { id: 'deepseek-v4-pro', provider: 'openai_compatible', model: 'deepseek-v4-pro' }
];

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

export const resolveFrontendModel = (modelId: string | undefined, fallback: ResolvedLlm): ResolvedLlm => {
  const raw = modelId?.trim();
  if (!raw) return fallback;
  const key = raw.toLowerCase();
  const selectable = SELECTABLE_MODELS.find((item) => item.id === key);
  if (selectable) return { provider: selectable.provider, model: selectable.model };
  const legacy = LEGACY_MODEL_MAP[key];
  if (legacy) return legacy;
  return { provider: fallback.provider, model: raw };
};

/**
 * 聊天业务：写库 + 调大模型。
 * 流式接口的细节在 Controller 里（转发 SSE、结束时把助手回复再写入数据库）。
 */
@Injectable()
export class ChatService {
  private readonly maxContextMessages = Number(process.env.LLM_CONTEXT_MAX_MESSAGES || 12);
  private readonly maxContextChars = Number(process.env.LLM_CONTEXT_MAX_CHARS || 12000);
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

  private resolveModel(explicit?: string): string {
    if (explicit?.trim()) return explicit.trim();
    if (process.env.LLM_MODEL?.trim()) return process.env.LLM_MODEL.trim();
    return this.llmProvider() === 'dashscope' ? DEFAULT_DASHSCOPE_MODEL : DEFAULT_DEEPSEEK_MODEL;
  }

  /** 一次请求内用哪个网关、哪个模型名 */
  private resolveLlmFromRequest(modelId?: string): ResolvedLlm {
    return resolveFrontendModel(modelId, { provider: this.llmProvider(), model: this.resolveModel() });
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

  /** 给新会话选择器用：只暴露当前模型，并写明缺哪家密钥 */
  listSelectableModels(): SelectableChatModel[] {
    return SELECTABLE_MODELS.map((item) => {
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
   * - 保留全部 system + 最近 N 条对话
   * - 再按总字符预算从最老对话开始裁剪
   */
  private normalizeContext(messages: ChatStreamMessage[], responseFormat?: ResponseFormat): ChatStreamMessage[] {
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
    const recentDialog = dialog.slice(-Math.max(1, this.maxContextMessages));
    const merged = [...systems, ...recentDialog];

    const totalChars = () => merged.reduce((sum, m) => sum + m.content.length, 0);
    while (totalChars() > this.maxContextChars) {
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

  async sendMsg(userId: string, role: string, content: string, sessionId?: string, opts?: { llmModelId?: string }) {
    let realSessionId = sessionId?.trim() || undefined;
    if (!realSessionId || !(await this.sessionService.existSession(realSessionId, userId))) {
      const newSession = await this.sessionService.createSession(userId, content, opts?.llmModelId);
      realSessionId = newSession.id;
    } else if (opts?.llmModelId?.trim()) {
      await this.sessionService.setSessionLlmModelIdIfNull(realSessionId, userId, opts.llmModelId.trim());
    }

    const dbRole = lowerCaseToRole(role);
    const msg = await this.prisma.message.create({
      data: { sessionId: realSessionId, role: dbRole, content }
    });
    return { ...msg, role: roleToLowerCase(msg.role), sessionId: realSessionId };
  }

  /**
   * 1. 解析会话绑定与模型线路，缺密钥时直接拒绝，避免先写入会话
   * 2. 把用户这条话写入数据库
   * 3. 向大模型发起流式请求，把 Node 可读流交给 Controller 去 pipe 给浏览器
   */
  async chatStream(
    userId: string,
    messages: ChatStreamMessage[],
    sessionId?: string,
    modelId?: string,
    responseFormat?: ResponseFormat
  ) {
    const normalizedMessages = this.normalizeContext(messages, responseFormat);
    const userContent = normalizedMessages[normalizedMessages.length - 1].content;

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
    const persistModelId = boundModelId ? undefined : reqModel || model;

    const msg = await this.sendMsg(userId, 'user', userContent, effectiveSessionId, {
      llmModelId: persistModelId
    });
    const realSessionId = msg.sessionId;
    const stream = await this.openProviderStream(provider, model, normalizedMessages, key);
    return { stream, sessionId: realSessionId, provider };
  }

  /**
   * 通义当前模型走 DashScope 的 OpenAI 兼容接口（北京旧域名仍可用），
   * 返回的 SSE 与 DeepSeek 一样是 delta.content，前端解析器已兼容。
   * 对话界面只渲染 content，因此关闭思考模式，避免推理片段占满输出且界面空白。
   */
  private async openProviderStream(
    provider: LlmProviderName,
    model: string,
    messages: ChatStreamMessage[],
    key: string
  ) {
    const openaiMessages = messages.map((item) => ({ role: item.role, content: item.content }));
    const base =
      provider === 'dashscope'
        ? (process.env.DASHSCOPE_BASE_URL || 'https://dashscope.aliyuncs.com/compatible-mode/v1').replace(/\/$/, '')
        : (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const body: Record<string, unknown> = {
      model,
      messages: openaiMessages,
      stream: true
    };
    if (provider === 'dashscope') {
      body.temperature = 0.7;
      body.max_tokens = 2048;
      if (/^qwen[3-9]/.test(model)) body.enable_thinking = false;
    } else if (model.startsWith('deepseek')) {
      body.thinking = { type: 'disabled' };
    }

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

  async saveAssistantMsg(userId: string, sessionId: string, content: string) {
    const text = content.trim();
    if (!text) return;
    await this.sendMsg(userId, 'assistant', text, sessionId);
  }
}
