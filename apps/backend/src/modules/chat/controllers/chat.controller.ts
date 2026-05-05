import { Controller, Post, Body, Res, Logger } from '@nestjs/common';
import { ChatService } from '../services/chat.services';
import { ChatDto } from '../dtos/chat.dto';
import { type Response } from 'express';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { ApiBody, ApiOkResponse, ApiOperation, ApiProduces, ApiTags } from '@nestjs/swagger';
import { StandardResponse } from 'src/common/response/standard.response';

/** 边收大模型字节、边拼出「完整助手回复」，方便流结束后写入数据库（和供应商返回的 JSON 格式有关） */
function accumulateAssistantFromSseChunk(
  provider: 'dashscope' | 'openai_compatible',
  state: { lineBuf: string; assistant: string },
  chunk: Buffer
) {
  state.lineBuf += chunk.toString();
  const lines = state.lineBuf.split('\n');
  state.lineBuf = lines.pop() ?? '';
  for (const raw of lines) {
    const line = raw.trim();
    if (!line.startsWith('data:')) continue;
    const jsonStr = line.replace(/^data:\s*/, '').trim();
    if (!jsonStr || jsonStr === '[DONE]') continue;
    try {
      const j = JSON.parse(jsonStr) as Record<string, unknown>;
      if (provider === 'dashscope') {
        const delta = (j as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta) {
          state.assistant += delta;
          continue;
        }
        const full = (j as { output?: { text?: string } }).output?.text;
        if (typeof full === 'string') state.assistant = full;
      } else {
        const d = (j as { choices?: { delta?: { content?: string } }[] }).choices?.[0]?.delta?.content;
        if (typeof d === 'string' && d) state.assistant += d;
      }
    } catch {
      // 半行 JSON，忽略
    }
  }
}

@Controller('chat')
@ApiTags('chat')
@ApiProduces('text/event-stream')
@ApiOkResponse({ schema: { type: 'string', example: 'data: {...}\\n\\n' } })
export class ChatController {
  private readonly logger = new Logger(ChatController.name);

  constructor(private readonly chatService: ChatService) {}

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

    const sseState = { lineBuf: '', assistant: '' };

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
          await this.chatService.saveAssistantMsg(user.sub, sessionId, sseState.assistant);
        } catch (error) {
          this.logger.error(`保存助手消息失败，sessionId=${sessionId}`, error as Error);
        }
        if (!res.writableEnded) res.end();
      })();
    });
  }
}
