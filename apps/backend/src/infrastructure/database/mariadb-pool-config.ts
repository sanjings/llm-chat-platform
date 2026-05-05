import type { PoolConfig } from 'mariadb';

/**
 * 将 `DATABASE_URL`（mysql:// 或 mariadb://）转为 mariadb 驱动的 PoolConfig。
 *
 * MySQL 8 默认 `caching_sha2_password`：无 TLS 的 TCP 连接通常需要
 * `allowPublicKeyRetrieval: true` 才能完成密钥交换；本机 `mysql` 客户端往往能连、
 * Node 驱动默认 false 时会出现 pool timeout（池中 active=0 idle=0）。
 *
 * @see https://github.com/mariadb-corporation/mariadb-connector-nodejs/blob/master/documentation/connection-options.md
 */
export function databaseUrlToMariadbPoolConfig(databaseUrl: string): PoolConfig {
  const u = new URL(databaseUrl.trim());

  const protocol = u.protocol.toLowerCase();
  if (protocol !== 'mysql:' && protocol !== 'mariadb:') {
    throw new Error(`DATABASE_URL 协议须为 mysql:// 或 mariadb://，当前为 ${u.protocol}`);
  }

  const database = u.pathname.replace(/^\//, '') || undefined;
  const user = u.username ? decodeURIComponent(u.username) : undefined;
  const password = u.password ? decodeURIComponent(u.password) : undefined;

  /** 默认开启；仅当显式设为 false 时关闭（适配 MySQL 8 caching_sha2_password 本机 TCP） */
  const allowPublicKey = (process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL ?? '').trim().toLowerCase() !== 'false';

  const connectTimeout = Number(process.env.DATABASE_CONNECT_TIMEOUT_MS || 15_000);
  if (Number.isNaN(connectTimeout) || connectTimeout < 1) {
    throw new Error('DATABASE_CONNECT_TIMEOUT_MS 须为正整数（毫秒）');
  }

  const useSsl = process.env.DATABASE_SSL === 'true';

  return {
    host: u.hostname || '127.0.0.1',
    port: u.port ? Number(u.port) : 3306,
    user,
    password,
    database,
    /** 与 @prisma/adapter-mariadb 使用字符串 URL 时的默认一致 */
    prepareCacheLength: 0,
    allowPublicKeyRetrieval: allowPublicKey,
    connectTimeout,
    ssl: useSsl ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== 'false' } : false
  };
}
