import { Controller, Get, Post, Body, Res, Logger, HttpException } from '@nestjs/common';
import { ChatService } from '../services/chat.services';
import { accumulateAssistantFromSseChunk, type AssistantSseState } from '../utils/assistant-sse';
import { classifyStreamError, formatChatStreamError, saveFailureMessage } from '../utils/chat-stream-events';
import { ChatDto, ChatModelListDto } from '../dtos/chat.dto';
import { type Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { ApiBody, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { StandardResponse } from 'src/common/response/standard.response';

@Controller('chat')
@ApiTags('chat')
@ApiProduces('text/event-stream')
@ApiOkResponse({ schema: { type: 'string', example: 'data: {...}\\n\\n' } })
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

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

    const flushTrailingLine = () => {
      if (sseState.lineBuf.trim()) {
        accumulateAssistantFromSseChunk(provider, sseState, Buffer.from('\n'));
      }
    };

    const writeErrorEvent = (code: Parameters<typeof formatChatStreamError>[0], message: string) => {
      if (!res.headersSent || res.writableEnded || clientDisconnected) return;
      res.write(formatChatStreamError(code, message));
    };

    /** 有正文才落库；返回 false 表示保存失败（没有正文不算失败）。 */
    const saveAssistantIfAny = async (): Promise<boolean> => {
      flushTrailingLine();
      if (!sseState.content.trim()) return true;
      try {
        await this.chatService.saveAssistantMsg(user.sub, sessionId, sseState.content, sseState.reasoning);
        return true;
      } catch (error) {
        this.logger.error(`保存助手消息失败，sessionId=${sessionId}`, error as Error);
        return false;
      }
    };

    const finish = async (reason: 'end' | 'error' | 'disconnect', error?: unknown) => {
      if (finalized) return;
      finalized = true;

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
        const failure = classifyStreamError(error);
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
      if (clientDisconnected) return;
      res.write(chunk);
      accumulateAssistantFromSseChunk(provider, sseState, chunk);
    });

    stream.on('error', (error: unknown) => {
      void finish('error', error);
    });

    stream.on('end', () => {
      void finish('end');
    });
  }
}
