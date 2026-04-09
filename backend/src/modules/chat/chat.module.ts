import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatService } from './services/chat.services';
import { ChatController } from './controllers/chat.contraller';

@Module({
  imports: [HttpModule],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
