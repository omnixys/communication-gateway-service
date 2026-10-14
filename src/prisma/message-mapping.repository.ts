import type { MessageMapping } from '../communication-gateway/models/entities/message-mapping.model.js';
import {
  DeliveryStatus,
  parseCommunicationChannelType,
  parseCommunicationProviderType,
  parseDeliveryStatus,
} from '../communication-gateway/models/enums/gateway.enums.js';
import type {
  DeliveryFailureRecord,
  MessageMappingStore,
} from '../communication-gateway/models/interfaces/message-mapping-store.port.js';
import { Prisma } from './generated/client.js';
import { PrismaService } from './prisma.service.js';
import { Injectable } from '@nestjs/common';
import { ContextAccessor } from '@omnixys/context-ts';
import { isUUID } from 'class-validator';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MessageMappingRepository implements MessageMappingStore {
  constructor(private readonly prisma: PrismaService) {}

  async save(mapping: MessageMapping): Promise<void> {
    const organizationId = validOrganizationId(
      mapping.organizationId || mapping.tenantId,
    );
    await this.prisma.$transaction(async (tx) => {
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
      await this.enqueue(tx, mapping, mapping.status);
    });
  }

  async getByProviderMessageId(
    providerMessageId: string,
  ): Promise<MessageMapping | null> {
    const row = await this.prisma.messageMapping.findUnique({
      where: { providerMessageId },
    });
    return row ? this.toDomain(row) : null;
  }
  async getByInternalId(internalId: string): Promise<MessageMapping | null> {
    const row = await this.prisma.messageMapping.findUnique({
      where: { internalId },
    });
    return row ? this.toDomain(row) : null;
  }
  async findByProviderAndProviderMessageId(
    provider: MessageMapping['provider'],
    providerMessageId: string,
  ): Promise<MessageMapping | null> {
    const row = await this.prisma.messageMapping.findFirst({
      where: { provider, providerMessageId },
    });
    return row ? this.toDomain(row) : null;
  }
  async updateStatus(
    providerMessageId: string,
    status: DeliveryStatus,
    error: string | null = null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const row = await tx.messageMapping.findUnique({
        where: { providerMessageId },
      });
      if (!row) {
        return;
      }
      await tx.messageMapping.update({
        where: { providerMessageId },
        data: { status, lastError: error, lastStatusChange: new Date() },
      });
      await this.enqueue(tx, this.toDomain(row), status);
    });
  }
  async incrementRetry(internalId: string): Promise<void> {
    await this.prisma.messageMapping.updateMany({
      where: { internalId },
      data: { retryCount: { increment: 1 } },
    });
  }
  async recordFailure(record: DeliveryFailureRecord): Promise<void> {
    const tenantId = validOrganizationId(record.organizationId);
    const errorCode =
      record.errorCode
        .toUpperCase()
        .replaceAll(/[^\dA-Z]+/gu, '_')
        .replaceAll(/^_+|_+$/gu, '')
        .slice(0, 100) || 'PROVIDER_FAILURE';
    await this.prisma.$transaction(async (tx) => {
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
      await tx.analyticsOutbox.upsert({
        where: { deduplicationKey: `${tenantId}:${record.internalId}:FAILED` },
        update: {},
        create: {
          id: randomUUID(),
          deduplicationKey: `${tenantId}:${record.internalId}:FAILED`,
          tenantId,
          topic: 'communication.delivery.failed.v1',
          payload: {
            eventName: 'MessageDeliveryFailed',
            aggregateId: record.internalId,
            properties: {
              channel: record.channel,
              provider: record.provider,
              status: DeliveryStatus.FAILED,
            },
          },
          correlationId: ContextAccessor.current()?.correlationId,
        },
      });
    });
  }
  async health(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  }
  private async enqueue(
    tx: Prisma.TransactionClient,
    mapping: MessageMapping,
    status: DeliveryStatus,
  ): Promise<void> {
    if (
      ![
        DeliveryStatus.DELIVERED,
        DeliveryStatus.READ,
        DeliveryStatus.FAILED,
      ].includes(status)
    ) {
      return;
    }
    const succeeded = status !== DeliveryStatus.FAILED;
    const tenantId = validOrganizationId(
      mapping.organizationId || mapping.tenantId,
    );
    await tx.analyticsOutbox.upsert({
      where: {
        deduplicationKey: `${tenantId}:${mapping.internalId}:${status}`,
      },
      update: {},
      create: {
        id: randomUUID(),
        deduplicationKey: `${tenantId}:${mapping.internalId}:${status}`,
        tenantId,
        topic: succeeded
          ? 'communication.delivery.succeeded.v1'
          : 'communication.delivery.failed.v1',
        correlationId: ContextAccessor.current()?.correlationId,
        payload: {
          eventName: succeeded
            ? 'MessageDeliverySucceeded'
            : 'MessageDeliveryFailed',
          aggregateId: mapping.internalId,
          properties: {
            channel: mapping.channel,
            conversationId: mapping.conversationId,
            provider: mapping.provider,
            providerMessageId: mapping.providerMessageId,
            status,
          },
        },
      },
    });
  }
  private toDomain(
    row: Prisma.MessageMappingGetPayload<object>,
  ): MessageMapping {
    const metadata = row.metadata;
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
      metadata:
        typeof metadata === 'object' &&
        metadata !== null &&
        !Array.isArray(metadata)
          ? metadata
          : null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

function validOrganizationId(value: string): string {
  if (!isUUID(value, '4')) {
    throw new Error(
      'Verified UUID organization context is required for delivery facts',
    );
  }
  return value;
}
