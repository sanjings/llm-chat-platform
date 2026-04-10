import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionService } from 'src/modules/session/services/session.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '../../../generated/prisma/enums';

const ROLE_MAP: Record<string, Role> = {
  user: Role.USER,
  assistant: Role.ASSISTANT,
  system: Role.SYSTEM
};

/** 和前端约定一致的消息结构 */
export type ChatStreamMessage = { role: string; content: string };

/**
 * 聊天业务：写库 + 调大模型。
 * 流式接口的细节在 Controller 里（转发 SSE、结束时把助手回复再写入数据库）。
 */
@Injectable()
export class ChatService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
    private readonly http: HttpService
  ) {}

  /** 用环境变量决定走哪家 API；以后要做「多模型切换」主要也是改这里读配置 */
  private llmProvider(): 'dashscope' | 'openai_compatible' {
    const p = (process.env.LLM_PROVIDER || 'dashscope').toLowerCase();
    if (p === 'openai_compatible' || p === 'openai' || p === 'deepseek') {
      return 'openai_compatible';
    }
    return 'dashscope';
  }

  private resolveModel(explicit?: string): string {
    if (explicit?.trim()) return explicit.trim();
    if (process.env.LLM_MODEL) return process.env.LLM_MODEL;
    return this.llmProvider() === 'dashscope' ? 'qwen-max' : 'deepseek-chat';
  }

  private resolveApiKey(): string {
    if (process.env.LLM_API_KEY) return process.env.LLM_API_KEY;
    if (this.llmProvider() === 'dashscope' && process.env.DASHSCOPE_API_KEY) {
      return process.env.DASHSCOPE_API_KEY;
    }
    throw new Error('请配置 LLM_API_KEY（用通义时可继续用 DASHSCOPE_API_KEY）');
  }

  async sendMsg(userId: string, role: string, content: string, sessionId?: string) {
    let realSessionId = sessionId;
    if (!realSessionId || !(await this.sessionService.existSession(realSessionId, userId))) {
      const newSession = await this.sessionService.createSession(userId, content);
      realSessionId = newSession.id;
    }

    const dbRole = ROLE_MAP[role] ?? Role.USER;
    const msg = await this.prisma.message.create({
      data: { sessionId: realSessionId, role: dbRole, content }
    });
    return { ...msg, role, sessionId: realSessionId };
  }

  /**
   * 1. 先把用户这条话写入数据库
   * 2. 向大模型发起流式请求，把 Node 可读流交给 Controller 去 pipe 给浏览器
   */
  async chatStream(userId: string, messages: ChatStreamMessage[], sessionId?: string, modelId?: string) {
    const userContent = messages[messages.length - 1].content;
    const msg = await this.sendMsg(userId, 'user', userContent, sessionId);
    const realSessionId = msg.sessionId;
    const model = this.resolveModel(modelId);
    const key = this.resolveApiKey();

    if (this.llmProvider() === 'dashscope') {
      const res = await firstValueFrom(
        this.http.post(
          'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
          {
            model,
            input: { messages },
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
    const openaiMessages = messages.map((m) => ({ role: m.role, content: m.content }));
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
