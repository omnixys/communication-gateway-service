import 'reflect-metadata';

import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { inject } from 'vitest';

import { applyE2eEnv } from '../../../test-tools/e2e/infrastructure.mjs';

const execFileAsync = promisify(execFile);

export interface TestApp {
  app: NestFastifyApplication;
  moduleRef: TestingModule;
}

export async function createTestApp(): Promise<TestApp> {
  const e2e = inject<Record<string, string | number | boolean> | undefined>(
    'omnixys-e2e',
  );
  if (!e2e) {
    throw new Error('omnixys-e2e not provided by globalSetup');
  }
  applyE2eEnv(e2e);

  await execFileAsync('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
    env: { ...process.env },
  });

  const { AppModule } = await import('../../dist/app.module.js');
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  // main.ts enables rawBody so the webhook HMAC verification can read the
  // untouched request payload; the test app mirrors that option.
  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logger: false, bodyLimit: 10 * 1024 * 1024 }),
    { rawBody: true },
  );
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  return { app, moduleRef };
}

export async function shutdownTestApp(
  testApp: TestApp | undefined,
): Promise<void> {
  await settle(testApp?.app?.close());
  await settle(testApp?.moduleRef?.close());
}

async function settle(operation: Promise<unknown> | undefined): Promise<void> {
  if (!operation) {
    return;
  }
  await operation.catch(() => undefined);
}
