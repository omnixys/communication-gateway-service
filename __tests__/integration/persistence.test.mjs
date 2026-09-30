/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import '../support/env.mjs';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig } from '../../dist/config/configuration.js';
import {
  CommunicationProviderType,
  DeliveryStatus,
} from '../../dist/domain/enums.js';
import { AnalyticsOutboxWorker } from '../../dist/infrastructure/analytics/analytics-outbox.worker.js';
import { DisabledRawEventPublisher } from '../../dist/infrastructure/events/kafka-raw-event.publisher.js';
import { InMemoryMessageMappingStore } from '../../dist/infrastructure/persistence/in-memory-message-mapping.store.js';
import {
  PersistenceDisabledError,
  PrismaService,
} from '../../dist/infrastructure/persistence/prisma.service.js';

describe('loadConfig without a database', () => {
  it('disables persistence for an empty DATABASE_URL', () => {
    const config = loadConfig({
      ENVIRONMENT: 'local',
      LOG_LEVEL: 'silent',
      DATABASE_URL: '',
      KAFKA_BROKER: '',
    });

    assert.equal(config.database.enabled, false);
  });
});

describe('PrismaService without a database', () => {
  const config = loadConfig({
    ENVIRONMENT: 'local',
    LOG_LEVEL: 'silent',
    DATABASE_URL: '',
    KAFKA_BROKER: '',
  });
  const prisma = new PrismaService(config);

  it('reports persistence as disabled', () => {
    assert.equal(prisma.isEnabled, false);
    assert.equal(prisma.maybeClient, null);
  });

  it('fails loudly instead of pretending to persist', () => {
    assert.throws(() => prisma.client, PersistenceDisabledError);
  });

  it('answers the readiness probe with false', async () => {
    assert.equal(await prisma.ping(), false);
  });

  it('starts and stops without a connection', async () => {
    await assert.doesNotReject(prisma.onModuleInit());
    await assert.doesNotReject(prisma.onModuleDestroy());
  });
});

describe('PrismaService with an unreachable database', () => {
  const config = loadConfig({
    ENVIRONMENT: 'local',
    LOG_LEVEL: 'silent',
    DATABASE_URL:
      'postgresql://omnixys:omnixys@127.0.0.1:1/omnixys?connect_timeout=1',
    KAFKA_BROKER: '',
  });
  const prisma = new PrismaService(config);

  it('keeps the client available for the repositories', () => {
    assert.equal(prisma.isEnabled, true);
    assert.notEqual(prisma.maybeClient, null);
  });

  it('does not crash the bootstrap when the database is down', async () => {
    await assert.doesNotReject(prisma.onModuleInit());
  });

  it('reports the outage through the readiness probe', async () => {
    assert.equal(await prisma.ping(), false);
  });

  it('lets the outbox worker wait for a database instead of failing', async () => {
    const worker = new AnalyticsOutboxWorker(
      prisma.maybeClient,
      new DisabledRawEventPublisher(),
    );

    assert.equal(await worker.runOnce(), 0);
  });
});

describe('InMemoryMessageMappingStore as the persistence fallback', () => {
  it('keeps a mapping across the operations the webhook path performs', async () => {
    const store = new InMemoryMessageMappingStore();

    await store.save({
      internalId: 'internal-1',
      providerMessageId: 'provider-1',
      provider: CommunicationProviderType.EVOLUTION,
      channel: 'WHATSAPP',
      conversationId: '491700000000@c.us',
      sender: '491700000000@c.us',
      recipient: '491700000001@c.us',
      status: DeliveryStatus.PENDING,
      tenantId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      providerInstance: 'omnixys',
      retryCount: 0,
      lastStatusChange: null,
      lastError: null,
      metadata: null,
      createdAt: new Date(),
      updatedAt: null,
    });

    const found = await store.findByProviderAndProviderMessageId(
      CommunicationProviderType.EVOLUTION,
      'provider-1',
    );

    assert.equal(found.internalId, 'internal-1');
    assert.equal(await store.health(), true);
  });
});
