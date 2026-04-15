import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/** 持久化基础设施（Prisma / DB），与业务模块、横切 common 分离 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
