import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../generated/prisma/client';
import { LoggerService } from 'src/common/logger/logger.service';
import { databaseUrlToMariadbPoolConfig } from './mariadb-pool-config';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private readonly logger: LoggerService) {
    const url = process.env.DATABASE_URL?.trim();
    if (!url) {
      throw new Error('DATABASE_URL 未配置，无法连接数据库');
    }
    const adapter = new PrismaMariaDb(databaseUrlToMariadbPoolConfig(url));
    super({
      adapter,
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'event', level: 'error' },
        { emit: 'event', level: 'warn' }
      ]
    });

    this.logger.setContext(PrismaService.name);

    this.$on('query' as never, (e: { query: string; params: string; duration?: number; time?: number }) => {
      const ms = e.duration ?? e.time ?? 0;
      this.logger.debug(`[SQL] ${e.query} | 参数: ${e.params} | 耗时: ${ms}ms`);
    });

    this.$on('error' as never, (e: { message: string; target?: string }) => {
      this.logger.error(`[数据库错误] ${e.message}`, e.target ?? '');
    });

    this.$on('warn' as never, (e: { message: string }) => {
      this.logger.warn(`[数据库警告] ${e.message}`);
    });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('数据库连接成功');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('数据库连接已安全关闭');
  }
}
