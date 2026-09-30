#!/usr/bin/env node
/**
 * Runs the Prisma CLI with a normalized `DATABASE_URL`.
 *
 * The deployments inject the SQLAlchemy flavoured URL
 * (`postgresql+asyncpg://…`) that the previous Python runtime required, and
 * the local `.env` carries the same value. The Prisma CLI validates the URL
 * before it runs, so this wrapper rewrites the variable in the child process
 * only. The value is never printed and the infrastructure stays untouched.
 *
 * Usage: `node scripts/prisma.mts migrate deploy --schema prisma/schema.prisma`
 */
import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

import { normalizeDatabaseUrl } from '../src/config/database-url.ts';

const require = createRequire(import.meta.url);
const prismaBin = require.resolve('prisma/build/index.js');

const [, , ...args] = process.argv;
if (args.length === 0) {
  process.stderr.write('usage: node scripts/prisma.mts <prisma command> [...]\n');
  process.exit(2);
}

const env = { ...process.env };
const rawUrl = env['DATABASE_URL'] ?? readDatabaseUrlFromFile();
if (rawUrl.length > 0) {
  env['DATABASE_URL'] = normalizeDatabaseUrl(rawUrl);
}

const child = spawn(process.execPath, [prismaBin, ...args], {
  stdio: 'inherit',
  env,
});

child.on('exit', (code, signal) => {
  if (signal !== null) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});

/** Reads `DATABASE_URL` from the local `.env` without logging its value. */
function readDatabaseUrlFromFile(): string {
  const path = '.env';
  if (!existsSync(path)) {
    return '';
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const match = /^\s*(?:export\s+)?DATABASE_URL\s*=\s*(.*)\s*$/u.exec(line);
    if (match?.[1] === undefined) {
      continue;
    }
    const value = match[1].trim();
    return (
      value.startsWith('"') && value.endsWith('"')
        ? value.slice(1, -1)
        : value
    );
  }
  return '';
}
