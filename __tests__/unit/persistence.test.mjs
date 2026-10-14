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

import './../support/env.mjs';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AnalyticsOutboxWorker } from '../../dist/analytics/analytics-outbox.worker.js';
import {
  CommunicationProviderType,
  DeliveryStatus,
} from '../../dist/communication-gateway/models/enums/gateway.enums.js';
import { RecordingRawPublisher, messageMapping } from '../support/fakes.mjs';
import { InMemoryMessageMappingStore } from '../support/message-mapping-store.mjs';

/** Minimal in-memory stand-in for the `analyticsOutbox` Prisma delegate. */
function fakeOutboxDb(rows = []) {
  const state = rows.map((row) => ({ ...row }));
  return {
    rows: state,
    analyticsOutbox: {
      findMany: async () =>
        state
          .filter((row) => row.publishedAt === null && row.lockedAt === null)
          .map((row) => ({ id: row.id })),
      updateMany: async ({ where, data }) => {
        const row = state.find((candidate) => candidate.id === where.id);
        if (row === undefined) {
          return { count: 0 };
        }
        Object.assign(row, data);
        return { count: 1 };
      },
      findUnique: async ({ where }) => {
        const row = state.find((candidate) => candidate.id === where.id);
        return row === undefined ? null : { ...row };
      },
      update: async ({ where, data }) => {
        const row = state.find((candidate) => candidate.id === where.id);
        Object.assign(row, data);
        return { ...row };
      },
    },
  };
}

function outboxRow(overrides = {}) {
  return {
    id: 'outbox-1',
    topic: 'communication.delivery.succeeded.v1',
    payload: { messageId: 'internal-1' },
    tenantId: '11111111-1111-4111-8111-111111111111',
    correlationId: 'correlation-1',
    attempts: 0,
    createdAt: new Date('2026-02-01T10:00:00.000Z'),
    publishedAt: null,
    deadLetteredAt: null,
    nextAttemptAt: new Date('2026-02-01T10:00:00.000Z'),
    lockedAt: null,
    lockedBy: null,
    lastError: null,
    ...overrides,
  };
}

describe('InMemoryMessageMappingStore', () => {
  it('round trips a mapping by both correlation keys', async () => {
    const store = new InMemoryMessageMappingStore();
    await store.save(messageMapping());

    const byProviderId =
      await store.getByProviderMessageId('provider-message-1');
    const byInternalId = await store.getByInternalId('internal-1');

    assert.equal(byProviderId.internalId, 'internal-1');
    assert.equal(byInternalId.providerMessageId, 'provider-message-1');
  });

  it('scopes a lookup to the provider that produced the message', async () => {
    const store = new InMemoryMessageMappingStore();
    await store.save(messageMapping({ status: DeliveryStatus.SENT }));

    const sameProvider = await store.findByProviderAndProviderMessageId(
      CommunicationProviderType.EVOLUTION,
      'provider-message-1',
    );
    const otherProvider = await store.findByProviderAndProviderMessageId(
      CommunicationProviderType.RESEND,
      'provider-message-1',
    );

    assert.equal(sameProvider.internalId, 'internal-1');
    assert.equal(otherProvider, null);
  });

  it('does not hand out a mutable reference to its own state', async () => {
    const store = new InMemoryMessageMappingStore();
    await store.save(messageMapping({ status: DeliveryStatus.SENT }));

    const first = await store.getByProviderMessageId('provider-message-1');
    first.status = DeliveryStatus.FAILED;

    const second = await store.getByProviderMessageId('provider-message-1');
    assert.equal(second.status, DeliveryStatus.SENT);
  });

  it('records a status transition with its error', async () => {
    const store = new InMemoryMessageMappingStore();
    await store.save(messageMapping({ status: DeliveryStatus.SENT }));

    await store.updateStatus(
      'provider-message-1',
      DeliveryStatus.FAILED,
      'smtp 550',
    );

    const mapping = await store.getByProviderMessageId('provider-message-1');
    assert.equal(mapping.status, DeliveryStatus.FAILED);
    assert.equal(mapping.lastError, 'smtp 550');
  });

  it('counts a retry and reports a healthy store', async () => {
    const store = new InMemoryMessageMappingStore();
    await store.save(messageMapping({ retryCount: 0 }));

    await store.incrementRetry('internal-1');

    const mapping = await store.getByInternalId('internal-1');
    assert.equal(mapping.retryCount, 1);
    assert.equal(await store.health(), true);
  });

  it('remembers a delivery failure for the audit trail', async () => {
    const store = new InMemoryMessageMappingStore();

    await store.recordFailure({
      internalId: 'internal-1',
      provider: CommunicationProviderType.STALWART,
      channel: 'EMAIL',
      organizationId: '22222222-2222-4222-8222-222222222222',
      errorCode: 'SMTP_REJECTED',
    });

    assert.equal(await store.health(), true);
  });

  it('returns null for an unknown message instead of throwing', async () => {
    const store = new InMemoryMessageMappingStore();

    assert.equal(await store.getByProviderMessageId('missing'), null);
    assert.equal(await store.getByInternalId('missing'), null);
  });
});

describe('AnalyticsOutboxWorker', () => {
  it('publishes a pending row and marks it as published', async () => {
    const db = fakeOutboxDb([outboxRow()]);
    const raw = new RecordingRawPublisher();
    const worker = new AnalyticsOutboxWorker(db, raw);

    const published = await worker.runOnce();

    assert.equal(published, 1);
    assert.equal(raw.messages.length, 1);
    assert.equal(raw.messages[0].topic, 'communication.delivery.succeeded.v1');
    assert.equal(db.rows[0].publishedAt !== null, true);
    assert.equal(db.rows[0].lockedBy, null);
  });

  it('publishes an envelope with the platform event headers', async () => {
    const db = fakeOutboxDb([outboxRow()]);
    const raw = new RecordingRawPublisher();

    await new AnalyticsOutboxWorker(db, raw).runOnce();

    const envelope = raw.parsed()[0];
    assert.equal(envelope.eventId, 'outbox-1');
    assert.equal(envelope.service, 'communication-gateway');
    assert.equal(envelope.eventVersion, '1');
    assert.equal(
      raw.messages[0].headers['x-tenant-id'],
      '11111111-1111-4111-8111-111111111111',
    );
    assert.equal(raw.messages[0].key, 'outbox-1');
  });

  it('releases a row for a later attempt when the broker rejects it', async () => {
    const db = fakeOutboxDb([outboxRow()]);
    const raw = new RecordingRawPublisher({
      failWith: new Error('broker down'),
    });

    const published = await new AnalyticsOutboxWorker(db, raw).runOnce();

    assert.equal(published, 0);
    assert.equal(db.rows[0].publishedAt, null);
    assert.equal(db.rows[0].attempts, 1);
    assert.match(db.rows[0].lastError, /broker down/u);
    assert.equal(db.rows[0].nextAttemptAt.getTime() > Date.now(), true);
  });

  it('dead letters a row that exhausted its retries', async () => {
    const db = fakeOutboxDb([outboxRow({ attempts: 9 })]);
    const raw = new RecordingRawPublisher({
      failWith: new Error('broker down'),
    });

    await new AnalyticsOutboxWorker(db, raw).runOnce();

    assert.equal(db.rows[0].deadLetteredAt !== null, true);
    assert.equal(db.rows[0].attempts, 10);
  });

  it('does nothing without a database, so a gateway without one still boots', async () => {
    const raw = new RecordingRawPublisher();
    const worker = new AnalyticsOutboxWorker(null, raw);

    assert.equal(await worker.runOnce(), 0);
    await assert.doesNotReject(worker.start());
    await assert.doesNotReject(worker.stop());
    assert.equal(raw.messages.length, 0);
  });

  it('does not start a poll loop while no broker is configured', async () => {
    const db = fakeOutboxDb([outboxRow()]);
    const raw = new RecordingRawPublisher({ enabled: false });

    const worker = new AnalyticsOutboxWorker(db, raw);
    await worker.start();
    await new Promise((resolve) => setTimeout(resolve, 20));
    await worker.stop();

    assert.equal(raw.messages.length, 0);
  });

  it('publishes every pending row of a batch', async () => {
    const db = fakeOutboxDb([
      outboxRow({ id: 'outbox-1' }),
      outboxRow({ id: 'outbox-2' }),
    ]);
    const raw = new RecordingRawPublisher();

    assert.equal(await new AnalyticsOutboxWorker(db, raw).runOnce(), 2);
  });

  it('ignores a row that was published already', async () => {
    const db = fakeOutboxDb([outboxRow({ publishedAt: new Date() })]);
    const raw = new RecordingRawPublisher();

    assert.equal(await new AnalyticsOutboxWorker(db, raw).runOnce(), 0);
  });
});
