import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ChatService } from './services/chat.services';
import { ChatController } from './controllers/chat.controller';
import { SessionModule } from '../session/session.module';

@Module({
  imports: [HttpModule, SessionModule],
  controllers: [ChatController],
  providers: [ChatService]
})
export class ChatModule {}
