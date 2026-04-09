import { Controller, Post, Body, Res } from '@nestjs/common';
import { ChatService } from '../services/chat.services';
import { ChatDto } from '../dto/chat.dto';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post('completions')
  async chat(@Body() dto: ChatDto, @Res() res) {
    const stream = await this.chatService.chat(dto.messages);

    // 标准SSE响应头
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    stream.pipe(res);

    stream.on('error', (err) => {
      console.error('通义千问流错误:', err);
      if (!res.headersSent) res.status(500).json({ error: 'AI服务异常' });
      res.end();
    });

    stream.on('end', () => res.end());
  }
}
