import { BadRequestException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionService } from 'src/modules/session/services/session.service';
import { PrismaService } from 'src/database/prisma.service';
import { lowerCaseToRole, roleToLowerCase } from 'src/utils/role.utils';
import type { ResponseFormatWire } from '../dtos/chat.dto';

/** 和前端约定一致的消息结构 */
export type ChatStreamMessage = { role: string; content: string };
type ResponseFormat = ResponseFormatWire | undefined;

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

  /** 用环境变量决定走哪家 API（未传 modelId 或 modelId 未命中映射时） */
  private llmProvider(): 'dashscope' | 'openai_compatible' {
    const p = (process.env.LLM_PROVIDER || 'dashscope').toLowerCase();
    if (p === 'openai_compatible' || p === 'openai' || p === 'deepseek') {
      return 'openai_compatible';
    }
    return 'dashscope';
  }

  /**
   * 前端 modelId → 实际 provider + 上游 model。
   * 未命中映射时：provider 仍看 LLM_PROVIDER，model 使用传入字符串（便于扩展新模型名）。
   */
  private readonly frontendModelMap: Record<string, { provider: 'dashscope' | 'openai_compatible'; model: string }> = {
    dashscope: { provider: 'dashscope', model: 'qwen-max' },
    openai_compatible: { provider: 'openai_compatible', model: 'deepseek-chat' },
    openai: { provider: 'openai_compatible', model: 'deepseek-chat' },
    deepseek: { provider: 'openai_compatible', model: 'deepseek-chat' },
    'qwen-max': { provider: 'dashscope', model: 'qwen-max' },
    'qwen-plus': { provider: 'dashscope', model: 'qwen-plus' },
    'qwen-turbo': { provider: 'dashscope', model: 'qwen-turbo' },
    'qwen2.5-72b-instruct': { provider: 'dashscope', model: 'qwen2.5-72b-instruct' },
    'qwen2.5-32b-instruct': { provider: 'dashscope', model: 'qwen2.5-32b-instruct' },
    'deepseek-chat': { provider: 'openai_compatible', model: 'deepseek-chat' },
    'deepseek-reasoner': { provider: 'openai_compatible', model: 'deepseek-reasoner' }
  };

  private resolveModel(explicit?: string): string {
    if (explicit?.trim()) return explicit.trim();
    if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
    return this.llmProvider() === 'dashscope' ? 'qwen-max' : 'deepseek-chat';
  }

  /** 一次请求内用哪个网关、哪个模型名 */
  private resolveLlmFromRequest(modelId?: string): {
    provider: 'dashscope' | 'openai_compatible';
    model: string;
  } {
    const raw = modelId?.trim();
    if (!raw) {
      return { provider: this.llmProvider(), model: this.resolveModel() };
    }
    const mapped = this.frontendModelMap[raw.toLowerCase()];
    if (mapped) {
      return { provider: mapped.provider, model: mapped.model };
    }
    return { provider: this.llmProvider(), model: raw };
  }

  private resolveApiKeyFor(provider: 'dashscope' | 'openai_compatible'): string {
    if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY;
    if (provider === 'dashscope' && process.env.DASHSCOPE_API_KEY) {
      return process.env.DASHSCOPE_API_KEY;
    }
    throw new Error('请配置 LLM_API_KEY（用通义时可继续用 DASHSCOPE_API_KEY）');
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
   * 1. 先把用户这条话写入数据库
   * 2. 向大模型发起流式请求，把 Node 可读流交给 Controller 去 pipe 给浏览器
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
    const persistModelId = boundModelId ? undefined : reqModel || model;

    const msg = await this.sendMsg(userId, 'user', userContent, effectiveSessionId, {
      llmModelId: persistModelId
    });
    const realSessionId = msg.sessionId;
    const key = this.resolveApiKeyFor(provider);

    if (provider === 'dashscope') {
      const res = await firstValueFrom(
        this.http.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model,
            input: { messages: normalizedMessages },
            parameters: {
              stream: true,
              temperature: 0.7,
              max_tokens: 2048,
              enable_search: false
            }
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${key}`,
              'X-DashScope-SSE': 'enable'
            },
            responseType: 'stream',
            timeout: 120000
          }
        )
      );
      return { stream: res.data as NodeJS.ReadableStream, sessionId: realSessionId, provider: 'dashscope' as const };
    }

    const base = (process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1').replace(/\/$/, '');
    const openaiMessages = normalizedMessages.map((m) => ({ role: m.role, content: m.content }));

    const res = await firstValueFrom(
      this.http.post(
        `${base}/chat/completions`,
        { model, messages: openaiMessages, stream: true },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`
          },
          responseType: 'stream',
          timeout: 120000
        }
      )
    );

    return {
      stream: res.data as NodeJS.ReadableStream,
      sessionId: realSessionId,
      provider: 'openai_compatible' as const
    };
  }

  async saveAssistantMsg(userId: string, sessionId: string, content: string) {
    const text = content.trim();
    if (!text) return;
    await this.sendMsg(userId, 'assistant', text, sessionId);
  }
}
