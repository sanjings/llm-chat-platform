import { Controller, Get, Post, Body, Res, Logger } from '@nestjs/common';
import { ChatService } from '../services/chat.services';
import { accumulateAssistantFromSseChunk, type AssistantSseState } from '../utils/assistant-sse';
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
    const { stream, sessionId, provider } = await this.chatService.chatStream(
      user.sub,
      body.messages,
      body.sessionId,
      body.modelId,
      body.responseFormat
    );

    const sseState: AssistantSseState = { lineBuf: '', content: '', reasoning: '', reasoningCursor: '' };

    res.setHeader('session-id', sessionId);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    stream.on('data', (chunk: Buffer) => {
      res.write(chunk);
      accumulateAssistantFromSseChunk(provider, sseState, chunk);
    });

    stream.on('error', () => {
      if (!res.headersSent) {
        res.json(StandardResponse.fail('AI服务异常'));
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    stream.on('end', () => {
      void (async () => {
        if (sseState.lineBuf.trim()) {
          accumulateAssistantFromSseChunk(provider, sseState, Buffer.from('\n'));
        }
        try {
          await this.chatService.saveAssistantMsg(user.sub, sessionId, sseState.content, sseState.reasoning);
        } catch (error) {
          this.logger.error(`保存助手消息失败，sessionId=${sessionId}`, error as Error);
        }
        if (!res.writableEnded) res.end();
      })();
    });
  }
}
