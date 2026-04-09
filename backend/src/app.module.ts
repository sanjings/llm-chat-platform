import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './modules/chat/chat.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true // 全局注册，所有模块都能直接用
    }),
    ChatModule
  ]
})
export class AppModule {}
