import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

const backendRoot = path.dirname(fileURLToPath(import.meta.url));

function loadBackendEnv() {
  const candidates = [
    path.join(backendRoot, '.env'),
    path.join(process.cwd(), '.env'),
    path.join(process.cwd(), 'backend', '.env')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      loadEnv({ path: p });
      return;
    }
  }
}

loadBackendEnv();

/** migrate 等命令需要真实库；generate 仅需合法 URL，无 .env 时用占位 */
const databaseUrl = process.env.DATABASE_URL?.trim() || 'mysql://127.0.0.1:3306/_prisma_generate_placeholder';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts'
  },
  datasource: {
    url: databaseUrl
  }
});
