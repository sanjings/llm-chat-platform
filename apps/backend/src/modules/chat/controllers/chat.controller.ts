import { Controller, Get, Post, Body, Res, Logger, HttpException } from '@nestjs/common';
import { ChatService } from '../services/chat.services';
import { accumulateAssistantFromSseChunk, type AssistantSseState } from '../utils/assistant-sse';
import {
  classifyStreamError,
  formatChatStreamError,
  saveFailureMessage,
  type ChatStreamErrorCode
} from '../utils/chat-stream-events';
import { ChatDto, ChatModelListDto, ChatStreamCancelDto } from '../dtos/chat.dto';
import { type Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { ApiBody, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { StandardResponse } from 'src/common/response/standard.response';

type FinishReason = 'end' | 'error' | 'disconnect' | 'cancel';

type StreamFailure = { code: ChatStreamErrorCode; message: string };

/** 进行中流的登记：协作停止时按 sessionId 找到，并校验属于当前用户。 */
type ActiveStreamEntry = {
  userId: string;
  cancel: () => Promise<void>;
};

@Controller('chat')
@ApiTags('chat')
@ApiProduces('text/event-stream')
@ApiOkResponse({ schema: { type: 'string', example: 'data: {...}\\n\\n' } })
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  /** key 为 sessionId，finish 时删除；同一会话同时只有一条流，重复登记以最后一条为准。 */
  private readonly activeStreams = new Map<string, ActiveStreamEntry>();

  constructor(private readonly chatService: ChatService) {}

  @Get('models')
  @ApiOperation({ summary: '当前部署的可选模型、默认模型，以及密钥是否已配置' })
  @ApiOkResponse({ type: ChatModelListDto })
  @ApiProduces('application/json')
  listModels() {
    return {
      models: this.chatService.listSelectableModels(),
      defaultModelId: this.chatService.defaultModelId()
    };
  }

  @Post('stream')
  @ApiOperation({ summary: '流式聊天' })
  @ApiBody({ type: ChatDto })
  @ApiProduces('text/event-stream')
  async chatStream(@Body() body: ChatDto, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    let chatResult: Awaited<ReturnType<ChatService['chatStream']>>;
    try {
      chatResult = await this.chatService.chatStream(
        user.sub,
        body.messages,
        body.sessionId,
        body.modelId,
        body.responseFormat
      );
    } catch (error) {
      // 参数/权限类异常保持 Nest 原有响应；上游超时、连不上等在这里给出明确 JSON 错误。
      if (error instanceof HttpException) throw error;
      const failure = classifyStreamError(error);
      this.logger.error('发起 AI 流式请求失败', error as Error);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json(StandardResponse.fail(failure.message));
      return;
    }

    const { stream, sessionId, provider } = chatResult;
    const sseState: AssistantSseState = { lineBuf: '', content: '', reasoning: '', reasoningCursor: '' };

    /** end / error / 客户端断开只会落库一次，避免重复助手消息。 */
    let finalized = false;
    let clientDisconnected = false;
    /** 协作停止时先置位再 destroy 上游，避免 destroy 同步触发的 error 被当成上游失败。 */
    let cancelRequested = false;

    const flushTrailingLine = () => {
      if (sseState.lineBuf.trim()) {
        accumulateAssistantFromSseChunk(provider, sseState, Buffer.from('\n'));
      }
    };

    const writeErrorEvent = (code: Parameters<typeof formatChatStreamError>[0], message: string) => {
      if (!res.headersSent || res.writableEnded || clientDisconnected) return;
      res.write(formatChatStreamError(code, message));
    };

    /** 正文或思考有其一就算已生成内容；两者都空才无需保存。 */
    const saveAssistantIfAny = async (): Promise<boolean> => {
      flushTrailingLine();
      if (!sseState.content.trim() && !sseState.reasoning.trim()) return true;
      try {
        await this.chatService.saveAssistantMsg(user.sub, sessionId, sseState.content, sseState.reasoning);
        return true;
      } catch (error) {
        this.logger.error(`保存助手消息失败，sessionId=${sessionId}`, error as Error);
        return false;
      }
    };

    const finish = async (reason: FinishReason, error?: unknown, failureOverride?: StreamFailure) => {
      if (finalized) return;
      finalized = true;
      this.activeStreams.delete(sessionId);

      if (reason === 'disconnect') {
        // 浏览器已经断开，写不了提示；尽力把已生成的内容落库即可。
        clientDisconnected = true;
        await saveAssistantIfAny();
        return;
      }

      if (reason === 'error' && !res.headersSent) {
        const failure = classifyStreamError(error);
        if (!res.writableEnded) {
          // 之前 setHeader 了 SSE，这里必须改回 JSON，前端才会按错误提示处理。
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.json(StandardResponse.fail(failure.message));
        }
        return;
      }

      const saved = await saveAssistantIfAny();
      if (reason === 'error') {
        const failure = failureOverride ?? classifyStreamError(error);
        writeErrorEvent(failure.code, failure.message);
      }
      if (!saved) writeErrorEvent('save_failed', saveFailureMessage);
      if (!res.writableEnded) res.end();
    };

    const handleClientDisconnect = () => {
      if (res.writableEnded || finalized) return;
      void finish('disconnect');
      const destroyable = stream as NodeJS.ReadableStream & { destroy?: () => void };
      destroyable.destroy?.();
    };

    // 只把浏览器连接关闭当成用户停止 / 网络断开。
    // 上游 IncomingMessage 的 aborted 表示模型侧中断，应走 error，不能当成客户端断开，
    // 否则会跳过错误事件，前端可能一直等到超时。
    res.on('close', handleClientDisconnect);

    res.setHeader('session-id', sessionId);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    stream.on('data', (chunk: Buffer) => {
      if (clientDisconnected || finalized) return;
      res.write(chunk);
      accumulateAssistantFromSseChunk(provider, sseState, chunk);
      // 上游 HTTP 200 但在 data 里直接报 error（如额度用尽）：不能静默结束，
      // 保存已有正文/思考后，以 error 事件把可读信息写给客户端。
      if (sseState.upstreamError) {
        void finish('error', undefined, { code: 'upstream_error', message: sseState.upstreamError });
      }
    });

    stream.on('error', (error: unknown) => {
      if (cancelRequested) return;
      void finish('error', error);
    });

    stream.on('end', () => {
      if (cancelRequested) return;
      void finish('end');
    });

    /** 协作停止：销毁上游流，仍按正常结束走保存与 save_failed 提示（SSE 还开着，客户端能看到）。 */
    const cancelCooperatively = async () => {
      if (finalized) return;
      cancelRequested = true;
      const destroyable = stream as NodeJS.ReadableStream & { destroy?: () => void };
      destroyable.destroy?.();
      await finish('cancel');
    };
    this.activeStreams.set(sessionId, { userId: user.sub, cancel: cancelCooperatively });
  }

  /**
   * 协作停止进行中的流式回复。
   * 只能取消当前用户自己的流；流已结束或不存在时幂等返回成功。
   * 登记与删除都在 chatStream 里维护，这里只负责转发取消。
   */
  @Post('stream/cancel')
  @ApiOperation({ summary: '停止当前会话进行中的流式回复（保存已生成内容，失败时通过 SSE 事件提示）' })
  @ApiBody({ type: ChatStreamCancelDto })
  @ApiProduces('application/json')
  async cancelStream(@Body() body: ChatStreamCancelDto, @CurrentUser() user: JwtPayload) {
    const sessionId = body.sessionId?.trim();
    const entry = sessionId ? this.activeStreams.get(sessionId) : undefined;
    if (entry && entry.userId === user.sub && sessionId) {
      // 先删登记再取消，避免重入；取消内部由 finalized 保证只执行一次。
      this.activeStreams.delete(sessionId);
      try {
        await entry.cancel();
      } catch (error) {
        this.logger.error(`协作停止流失败，sessionId=${sessionId}`, error as Error);
      }
    }
    return StandardResponse.success(null);
  }
}
