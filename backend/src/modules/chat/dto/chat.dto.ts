export class ChatDto {
  messages: {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }[];
}
