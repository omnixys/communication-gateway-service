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

import { randomUUID } from 'node:crypto';

import { getLogger } from '@omnixys/logger-ts';
import type { PrismaClient } from '@prisma/client';
import { Prisma, type AnalyticsOutbox } from '@prisma/client';

import type {
  DeliveryFailureRecord,
  MessageMappingStore,
} from '../../application/ports/message-mapping-store.port.js';
import {
  DeliveryStatus,
  parseCommunicationChannelType,
  parseCommunicationProviderType,
  parseDeliveryStatus,
} from '../../domain/enums.js';
import type { MessageMapping } from '../../domain/models/message-mapping.model.js';
import { asRecord } from '../../shared/coerce.js';
import { currentCorrelationId } from '../../shared/request-context.js';
import type { PrismaService } from './prisma.service.js';

const logger = getLogger('PrismaMessageMappingStore', 'class');

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ANALYTICS_FACT_STATUSES: ReadonlySet<DeliveryStatus> = new Set([
  DeliveryStatus.DELIVERED,
  DeliveryStatus.READ,
  DeliveryStatus.FAILED,
]);

/**
 * Correlation store backed by PostgreSQL through Prisma.
 *
 * Every status change that matters for analytics writes an outbox record in
 * the same transaction, so a Kafka outage can never lose a delivery fact.
 */
export class PrismaMessageMappingStore implements MessageMappingStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(mapping: MessageMapping): Promise<void> {
    const organizationId = verifiedOrganizationId(
      mapping.organizationId || mapping.tenantId,
    );

    try {
      await this.prisma.client.$transaction(async (tx) => {
        await tx.messageMapping.create({
          data: {
            id: randomUUID(),
            internalId: mapping.internalId,
            providerMessageId: mapping.providerMessageId,
            provider: mapping.provider,
            channel: mapping.channel,
            conversationId: mapping.conversationId,
            sender: mapping.sender,
            recipient: mapping.recipient,
            status: mapping.status,
            tenantId: organizationId,
            organizationId,
            providerInstance: mapping.providerInstance,
            retryCount: mapping.retryCount,
            lastStatusChange: mapping.lastStatusChange,
            lastError: mapping.lastError,
            metadata:
              mapping.metadata === null
                ? Prisma.JsonNull
                : (mapping.metadata as Prisma.InputJsonValue),
            createdAt: mapping.createdAt,
          },
        });
        await enqueueDeliveryFact(tx, {
          internalId: mapping.internalId,
          providerMessageId: mapping.providerMessageId,
          provider: mapping.provider,
          channel: mapping.channel,
          conversationId: mapping.conversationId,
          organizationId,
          status: mapping.status,
        });
      });
      logger.debug(
        {
          internalId: mapping.internalId,
          provider: mapping.provider,
          providerMessageId: mapping.providerMessageId,
        },
        'mapping_save',
      );
    } catch (error) {
      logger.error(
        {
          internalId: mapping.internalId,
          provider: mapping.provider,
          error: error instanceof Error ? error.message : String(error),
        },
        'mapping_save_failed',
      );
      throw error;
    }
  }

  async getByProviderMessageId(
    providerMessageId: string,
  ): Promise<MessageMapping | null> {
    const row = await this.prisma.client.messageMapping.findUnique({
      where: { providerMessageId },
    });
    return row === null ? null : toDomain(row);
  }

  async getByInternalId(internalId: string): Promise<MessageMapping | null> {
    const row = await this.prisma.client.messageMapping.findUnique({
      where: { internalId },
    });
    return row === null ? null : toDomain(row);
  }

  async findByProviderAndProviderMessageId(
    provider: MessageMapping['provider'],
    providerMessageId: string,
  ): Promise<MessageMapping | null> {
    const row = await this.prisma.client.messageMapping.findFirst({
      where: { provider, providerMessageId },
    });
    return row === null ? null : toDomain(row);
  }

  async updateStatus(
    providerMessageId: string,
    status: DeliveryStatus,
    error: string | null = null,
  ): Promise<void> {
    try {
      await this.prisma.client.$transaction(async (tx) => {
        const row = await tx.messageMapping.findUnique({
          where: { providerMessageId },
        });
        if (row === null) {
          return;
        }
        await tx.messageMapping.update({
          where: { providerMessageId },
          data: {
            status,
            lastError: error,
            lastStatusChange: new Date(),
            updatedAt: new Date(),
          },
        });
        await enqueueDeliveryFact(tx, {
          internalId: row.internalId,
          providerMessageId,
          provider: row.provider,
          channel: row.channel,
          conversationId: row.conversationId,
          organizationId: row.organizationId || row.tenantId,
          status,
        });
      });
      logger.debug({ providerMessageId, status }, 'mapping_update_status');
    } catch (failure) {
      logger.error(
        {
          providerMessageId,
          status,
          error: failure instanceof Error ? failure.message : String(failure),
        },
        'mapping_update_status_failed',
      );
      throw failure;
    }
  }

  async incrementRetry(internalId: string): Promise<void> {
    await this.prisma.client.messageMapping.updateMany({
      where: { internalId },
      data: { retryCount: { increment: 1 }, updatedAt: new Date() },
    });
  }

  async recordFailure(record: DeliveryFailureRecord): Promise<void> {
    const tenantId = verifiedOrganizationId(record.organizationId);
    const errorCode = normalizeErrorCode(record.errorCode);

    await this.prisma.client.$transaction(async (tx) => {
      await tx.deliveryLog.create({
        data: {
          id: randomUUID(),
          messageId: record.internalId,
          providerType: record.provider,
          status: DeliveryStatus.FAILED,
          error: errorCode,
          attempts: 1,
          tenantId,
        },
      });
      await addOutbox(tx, {
        deduplicationKey: `${tenantId}:${record.internalId}:${DeliveryStatus.FAILED}`,
        tenantId,
        topic: 'communication.delivery.failed.v1',
        eventName: 'MessageDeliveryFailed',
        aggregateId: record.internalId,
        properties: {
          channel: record.channel,
          provider: record.provider,
          status: DeliveryStatus.FAILED,
        },
      });
    });
  }

  async health(): Promise<boolean> {
    return this.prisma.ping();
  }
}

/** Transaction client accepted by the outbox helpers. */
type OutboxClient = Prisma.TransactionClient | PrismaClient;

/**
 * Writes the analytics fact for a terminal delivery status.
 *
 * Intermediate states such as `PENDING` or `SENT` are not facts, so they are
 * skipped and the outbox stays free of noise.
 */
async function enqueueDeliveryFact(
  tx: OutboxClient,
  fact: {
    readonly internalId: string;
    readonly providerMessageId: string;
    readonly provider: string;
    readonly channel: string;
    readonly conversationId: string;
    readonly organizationId: string;
    readonly status: DeliveryStatus;
  },
): Promise<void> {
  if (!ANALYTICS_FACT_STATUSES.has(fact.status)) {
    return;
  }
  const succeeded =
    fact.status === DeliveryStatus.DELIVERED ||
    fact.status === DeliveryStatus.READ;

  await addOutbox(tx, {
    deduplicationKey: `${fact.organizationId}:${fact.internalId}:${fact.status}`,
    tenantId: fact.organizationId,
    topic: succeeded
      ? 'communication.delivery.succeeded.v1'
      : 'communication.delivery.failed.v1',
    eventName: succeeded ? 'MessageDeliverySucceeded' : 'MessageDeliveryFailed',
    aggregateId: fact.internalId,
    properties: {
      channel: fact.channel,
      conversationId: fact.conversationId,
      provider: fact.provider,
      providerMessageId: fact.providerMessageId,
      status: fact.status,
    },
  });
}

/** Inserts an outbox record unless its deduplication key already exists. */
export async function addOutbox(
  tx: OutboxClient,
  entry: {
    readonly deduplicationKey: string;
    readonly tenantId: string;
    readonly topic: string;
    readonly eventName: string;
    readonly aggregateId: string;
    readonly properties: Record<string, unknown>;
  },
): Promise<AnalyticsOutbox | null> {
  const existing = await tx.analyticsOutbox.findUnique({
    where: { deduplicationKey: entry.deduplicationKey },
    select: { id: true },
  });
  if (existing !== null) {
    return null;
  }

  return tx.analyticsOutbox.create({
    data: {
      id: randomUUID(),
      deduplicationKey: entry.deduplicationKey,
      tenantId: entry.tenantId,
      topic: entry.topic,
      correlationId: currentCorrelationId(),
      payload: {
        producer: 'communication-gateway',
        eventName: entry.eventName,
        aggregateId: entry.aggregateId,
        aggregateType: 'message-delivery',
        properties: entry.properties as Prisma.InputJsonObject,
        occurredAt: new Date().toISOString(),
      },
    },
  });
}

/** Maps a persisted row to the domain model. */
function toDomain(row: {
  readonly internalId: string;
  readonly providerMessageId: string;
  readonly provider: string;
  readonly channel: string;
  readonly conversationId: string;
  readonly sender: string;
  readonly recipient: string;
  readonly status: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly providerInstance: string;
  readonly retryCount: number;
  readonly lastStatusChange: Date | null;
  readonly lastError: string | null;
  readonly metadata: unknown;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}): MessageMapping {
  return {
    internalId: row.internalId,
    providerMessageId: row.providerMessageId,
    provider: parseCommunicationProviderType(row.provider),
    channel: parseCommunicationChannelType(row.channel),
    conversationId: row.conversationId,
    sender: row.sender,
    recipient: row.recipient,
    status: parseDeliveryStatus(row.status),
    tenantId: row.tenantId,
    organizationId: row.organizationId,
    providerInstance: row.providerInstance,
    retryCount: row.retryCount,
    lastStatusChange: row.lastStatusChange,
    lastError: row.lastError,
    metadata: asRecord(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

/**
 * Enforces that an analytics fact carries a real tenant identity.
 *
 * A malformed organization id would silently mix facts across tenants, so the
 * write fails instead of being attributed to the wrong tenant.
 *
 * @throws {Error} when the value is not a UUID.
 */
export function verifiedOrganizationId(value: string): string {
  if (!UUID_V4.test(value)) {
    throw new Error(
      'Verified UUID organization context is required for delivery facts',
    );
  }
  return value;
}

/** Converts a provider error into a stable, queryable code. */
export function normalizeErrorCode(value: string): string {
  const normalized = value
    .toUpperCase()
    .replaceAll(/[^\dA-Z]+/gu, '_')
    .replaceAll(/^_+|_+$/gu, '');
  return normalized.slice(0, 100) || 'PROVIDER_FAILURE';
}
