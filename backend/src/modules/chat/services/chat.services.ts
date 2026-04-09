import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatService {
  constructor(private readonly httpService: HttpService) {}

  async chat(messages: any[]) {
    const apiKey = process.env.DASHSCOPE_API_KEY;

    const response = await firstValueFrom(
      this.httpService.post(
        'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
        {
          model: 'qwen-max',
          input: { messages },
          parameters: {
            stream: true,
            temperature: 0.7,
            max_tokens: 1024,
            enable_search: false
          }
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            'X-DashScope-SSE': 'enable' // 关键：开启SSE流式响应
          },
          responseType: 'stream',
          timeout: 60000
        }
      )
    );

    return response.data;
  }
}
