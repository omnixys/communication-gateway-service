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
} from '../../dist/communication-gateway/models/enums/gateway.enums.js';
import { PrismaService } from '../../dist/prisma/prisma.service.js';
import { InMemoryMessageMappingStore } from '../../dist/prisma/in-memory-message-mapping.store.js';

const CLOSED_URL = 'postgresql://omnixys:omnixys@127.0.0.1:1/omnixys?connect_timeout=1';

describe('required database configuration', () => {
  it('rejects an empty DATABASE_URL', () => {
    assert.throws(() => loadConfig({ DATABASE_URL: '' }), /DATABASE_URL/);
  });

  it('fails startup when PostgreSQL cannot be reached', async () => {
    const config = loadConfig({ DATABASE_URL: CLOSED_URL, LOG_LEVEL: 'silent' });
    const prisma = new PrismaService(config);
    await assert.rejects(prisma.onModuleInit());
    await prisma.onModuleDestroy();
  });
});

describe('InMemoryMessageMappingStore for isolated tests', () => {
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
