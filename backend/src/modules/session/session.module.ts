import { Module } from '@nestjs/common';
import { SessionService } from './services/session.service';
import { SessionController } from './controllers/session.controller';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { SessionEntity } from './entites/session.entity';

@Module({
  // imports: [TypeOrmModule.forFeature([SessionEntity])],
  controllers: [SessionController],
  providers: [SessionService],
  exports: [SessionService]
})
export class SessionModule {}
