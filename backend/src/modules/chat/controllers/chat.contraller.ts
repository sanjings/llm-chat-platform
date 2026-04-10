import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { ChatService } from '../services/chat.services';
import { ChatDto } from '../dtos/chat.dto';
import { type Response } from 'express';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/modules/auth/decorators/current-user.decorator';
import type { JwtPayload } from 'src/modules/auth/interfaces/jwt-payload.interface';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

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
@UseGuards(JwtAuthGuard)
@ApiTags('chat')
@ApiBearerAuth()
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('stream')
  @ApiOperation({ summary: '流式聊天' })
  @ApiBody({ type: ChatDto })
  @ApiOkResponse({ description: 'SSE 流式响应' })
  async chatStream(@Body() body: ChatDto, @CurrentUser() user: JwtPayload, @Res() res: Response) {
    const { stream, sessionId, provider } = await this.chatService.chatStream(
      user.sub,
      body.messages,
      body.sessionId,
      body.modelId
    );

    const sseState = { lineBuf: '', assistant: '' };

    res.setHeader('session-id', sessionId);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // 不用 pipe：自己 write，才能在转发的同时统计助手全文
    stream.on('data', (chunk: Buffer) => {
      res.write(chunk);
      accumulateAssistantFromSseChunk(provider, sseState, chunk);
    });

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).json({ error: 'AI服务异常' });
      } else if (!res.writableEnded) {
        res.end();
      }
    });

    stream.on('end', () => {
      void (async () => {
        // 最后一行可能没有换行符，补一个让缓冲里的 data: 行被解析完
        if (sseState.lineBuf.trim()) {
          accumulateAssistantFromSseChunk(provider, sseState, Buffer.from('\n'));
        }
        await this.chatService.saveAssistantMsg(user.sub, sessionId, sseState.assistant);
        if (!res.writableEnded) res.end();
      })();
    });
  }
}
