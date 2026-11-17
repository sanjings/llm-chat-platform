import { ValidationPipe, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';

/**
 * HTTP JSON / urlencoded 请求体上限。
 *
 * 前端上下文上限是 80 条消息、120000 字符；实测最重常见包：
 * - 80 × 1500 个「你」= 362598 字节；
 * - 120000 个汉字内容约 360000 字节，再加约 2.6KB JSON 结构开销；
 * - 引号等字符 JSON.stringify 后还会有转义余量。
 * 512KiB（524288 字节）比 362598 大一截，但对转义余量偏紧；取 1mb 留足余量，
 * 同时保持有限上限，不无限放开。
 */
export const JSON_BODY_LIMIT = '1mb';
export const JSON_BODY_LIMIT_BYTES = 1024 * 1024;

/**
 * 创建 HTTP 应用，并一次性注册与 main.ts 相同的 body parser 配置。
 * 必须先关闭 Nest 默认解析器，否则默认 100kb 的 express.json() 会先返回 413，
 * 后面的高上限解析器根本轮不到执行。
 */
export async function createHttpApp(module: Type<unknown>): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(module, { bodyParser: false });
  app.useBodyParser('json', { limit: JSON_BODY_LIMIT });
  app.useBodyParser('urlencoded', { limit: JSON_BODY_LIMIT, extended: true });
  return app;
}

export function configureHttpApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true
    })
  );
}
