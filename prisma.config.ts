import { defineConfig } from 'prisma/config';

const offlineCommand = process.argv.some(
  (arg) => arg === 'generate' || arg === 'validate',
);
const databaseUrl =
  process.env.DATABASE_URL ??
  (offlineCommand ? 'postgresql://offline:offline@127.0.0.1:1/offline' : '');
if (!databaseUrl) {
  throw new Error('DATABASE_URL is required for Prisma commands');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    url: databaseUrl.replace(
      /^postgres(ql)?\+[a-z0-9]+:\/\//i,
      'postgresql://',
    ),
    ...(process.env.SHADOW_DATABASE_URL
      ? { shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL }
      : {}),
  },
});
