import '../support/env.mjs';

import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { it } from 'node:test';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { Test } from '@nestjs/testing';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { AppModule } from '../../dist/app.module.js';
import { PrismaService } from '../../dist/prisma/prisma.service.js';
import { PrismaMessageMappingStore } from '../../dist/prisma/prisma-message-mapping.store.js';
import { CommunicationProviderType, DeliveryStatus } from '../../dist/communication-gateway/models/enums/gateway.enums.js';
import { API_KEY_HEADER, INTERNAL_API_KEY } from '../support/env.mjs';

const run = promisify(execFile);

it('boots with migrated PostgreSQL and persists message mappings', async (t) => {
  let container;
  try {
    container = await new PostgreSqlContainer('postgres:17-alpine').start();
  } catch (error) {
    t.skip(`isolated PostgreSQL unavailable: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const previous = process.env.DATABASE_URL;
  let app;
  try {
    process.env.DATABASE_URL = container.getConnectionUri();
    await run('pnpm', ['exec', 'prisma', 'migrate', 'deploy'], {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
    const module = await Test.createTestingModule({ imports: [AppModule.forRoot()] }).compile();
    app = module.createNestApplication(new FastifyAdapter(), { rawBody: true });
    await app.init();

    const response = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/health/ready',
    });
    assert.equal(response.json().checks.database, true);

    const prisma = app.get(PrismaService);
    const store = new PrismaMessageMappingStore(prisma);
    const internalId = randomUUID();
    const providerMessageId = randomUUID();
    await store.save({
      internalId,
      providerMessageId,
      provider: CommunicationProviderType.EVOLUTION,
      channel: 'WHATSAPP',
      conversationId: randomUUID(),
      sender: 'sender',
      recipient: 'recipient',
      status: DeliveryStatus.PENDING,
      tenantId: '11111111-1111-4111-8111-111111111111',
      organizationId: '11111111-1111-4111-8111-111111111111',
      providerInstance: 'test',
      retryCount: 0,
      lastStatusChange: null,
      lastError: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: null,
    });
    assert.equal((await store.getByInternalId(internalId))?.providerMessageId, providerMessageId);

    const providers = await app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/providers',
      headers: { [API_KEY_HEADER]: INTERNAL_API_KEY },
    });
    assert.equal(providers.statusCode, 200);
  } finally {
    await app?.close();
    process.env.DATABASE_URL = previous;
    await container.stop();
  }
});
