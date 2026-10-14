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

import {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';

import { MESSAGE_MAPPING_STORE } from '../../prisma/tokens.js';
import { AddressResolutionError } from '../errors/gateway.errors.js';
import type { SendMessageDto } from '../models/dto/send-message.dto.js';
import { createMessageMapping } from '../models/entities/message-mapping.model.js';
import type { OutboundMessage } from '../models/entities/outbound-message.model.js';
import {
  CommunicationChannelType,
  CommunicationProviderType,
  ContentType,
  DeliveryStatus,
  parseCommunicationChannelType,
} from '../models/enums/gateway.enums.js';
import type { ResolutionContext } from '../models/inputs/resolution-context.model.js';
import type { AddressResolver } from '../models/interfaces/address-resolver.port.js';
import type { MessageMappingStore } from '../models/interfaces/message-mapping-store.port.js';
import { toIdentityResponse } from '../models/mappers/provider-identity.mapper.js';
import type { SendMessageResult } from '../models/payloads/send-message.payload.js';
import { ADDRESS_RESOLVER } from '../utils/tokens.js';
import { GatewayDispatcher } from './gateway-dispatcher.service.js';
import { ContextAccessor } from '@omnixys/context-ts';

const logger = getLogger('MessagesService', 'class');

/**
 * Application service behind `POST /api/v1/messages/send`.
 *
 * The controller stays a thin transport adapter: address resolution, metadata
 * normalization, the delivery attempt and the mapping write all live here.
 */
@Injectable()
export class MessagesService {
  constructor(
    private readonly dispatcher: GatewayDispatcher,
    @Inject(MESSAGE_MAPPING_STORE)
    private readonly mappingStore: MessageMappingStore,
    @Inject(ADDRESS_RESOLVER) private readonly addressResolver: AddressResolver,
  ) {}

  async send(dto: SendMessageDto): Promise<SendMessageResult> {
    const channelType = parseCommunicationChannelType(dto.channel);
    validateChannelFields(dto, channelType);

    const recipientId = dto.recipientId ?? '';
    logger.info({ messageId: dto.id, channel: dto.channel, recipientId }, 'send_message_request');

    const recipientAddress =
      dto.recipientAddress ?? (await this.resolveAddress(recipientId, channelType));

    const organizationId = resolveOrganizationId();
    const metadata = buildMetadata(dto, organizationId);
    const context: ResolutionContext = {
      tenantId: organizationId.length > 0 ? organizationId : null,
      deploymentId: null,
      metadata,
    };

    const message: OutboundMessage = {
      id: dto.id,
      channel: { type: channelType },
      to: recipientAddress,
      body: dto.body,
      contentType: dto.contentType ?? ContentType.TEXT,
      attachment: null,
      metadata,
    };

    const result = await this.dispatcher.dispatch(message, context);
    const providerType =
      result.providerIdentity?.providerType ?? defaultProviderTypeFor(channelType);

    if (!result.success) {
      await this.recordFailure(dto.id, providerType, channelType, organizationId, result.error);
      throw toDeliveryException(result.error);
    }

    if (result.providerMessageId !== null && result.providerMessageId.length > 0) {
      await this.saveMapping({
        dto,
        channelType,
        providerType,
        providerMessageId: result.providerMessageId,
        recipientAddress,
        organizationId,
        status: result.status,
        metadata,
      });
    }

    logger.info(
      {
        messageId: dto.id,
        providerMessageId: result.providerMessageId,
        channel: dto.channel,
      },
      'send_message_success',
    );

    return {
      success: result.success,
      providerMessageId: result.providerMessageId,
      status: result.status,
      error: result.error,
      providerIdentity: toIdentityResponse(result.providerIdentity),
    };
  }

  private async resolveAddress(
    recipientId: string,
    channelType: CommunicationChannelType,
  ): Promise<string> {
    try {
      return await this.addressResolver.resolve(recipientId, channelType);
    } catch (error) {
      const message =
        error instanceof AddressResolutionError || error instanceof Error
          ? error.message
          : String(error);
      logger.warn(
        { recipientId, channel: channelType, error: message },
        'address_resolution_failed',
      );
      throw new UnprocessableEntityException({
        message,
        error: 'ADDRESS_RESOLUTION_FAILED',
      });
    }
  }

  private async recordFailure(
    internalId: string,
    providerType: CommunicationProviderType,
    channelType: CommunicationChannelType,
    organizationId: string,
    providerError: string | null,
  ): Promise<void> {
    const errorCode = providerError ?? 'PROVIDER_FAILURE';
    try {
      await this.mappingStore.recordFailure({
        internalId,
        provider: providerType,
        channel: channelType,
        organizationId,
        errorCode,
      });
    } catch (error) {
      logger.error(
        { messageId: internalId, error: toMessage(error) },
        'failed_to_record_delivery_failure',
      );
    }
    logger.warn(
      { messageId: internalId, channel: channelType, error: errorCode },
      'send_message_failed',
    );
  }

  private async saveMapping(input: {
    readonly dto: SendMessageDto;
    readonly channelType: CommunicationChannelType;
    readonly providerType: CommunicationProviderType;
    readonly providerMessageId: string;
    readonly recipientAddress: string;
    readonly organizationId: string;
    readonly status: DeliveryStatus;
    readonly metadata: Readonly<Record<string, unknown>>;
  }): Promise<void> {
    const { dto, metadata } = input;
    try {
      await this.mappingStore.save(
        createMessageMapping({
          internalId: dto.id,
          providerMessageId: input.providerMessageId,
          provider: input.providerType,
          channel: input.channelType,
          conversationId: readString(metadata['conversationId']),
          sender: dto.senderId ?? '',
          recipient: input.recipientAddress,
          status: input.status,
          tenantId: input.organizationId,
          organizationId: input.organizationId,
          providerInstance: readString(metadata['providerInstance']),
          metadata: { ...metadata },
        }),
      );
    } catch (error) {
      logger.error(
        { messageId: dto.id, error: toMessage(error) },
        'failed_to_save_message_mapping',
      );
      throw new ServiceUnavailableException('DELIVERY_STATE_PERSISTENCE_FAILED');
    }
  }
}

function validateChannelFields(dto: SendMessageDto, channelType: CommunicationChannelType): void {
  const hasRecipient =
    (dto.recipientAddress !== undefined && dto.recipientAddress.length > 0) ||
    (dto.recipientId !== undefined && dto.recipientId.length > 0);
  if (!hasRecipient) {
    throw new BadRequestException('recipientAddress or recipientId is required');
  }
  if (
    channelType === CommunicationChannelType.EMAIL &&
    (dto.subject === undefined || dto.subject.length === 0)
  ) {
    throw new BadRequestException('subject is required for EMAIL');
  }
  if (
    channelType === CommunicationChannelType.WHATSAPP &&
    dto.contentType !== undefined &&
    dto.contentType !== 'TEXT'
  ) {
    throw new BadRequestException('WHATSAPP supports TEXT only in V1');
  }
}

function buildMetadata(dto: SendMessageDto, organizationId: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = { ...(dto.metadata ?? {}) };
  delete metadata['tenantId'];
  if (dto.subject !== undefined) {
    metadata['subject'] = dto.subject;
  }
  if (dto.senderAddress !== undefined) {
    metadata['senderAddress'] = dto.senderAddress;
  }
  if (organizationId.length > 0) {
    metadata['tenantId'] = organizationId;
  }
  return metadata;
}

/**
 * Reads the tenant from the request context and validates its shape.
 *
 * The context is populated from `x-tenant-id`; a non UUID value is a client
 * error rather than a persistence error.
 */
function resolveOrganizationId(): string {
  const context = ContextAccessor.current();
  const organizationId = context?.tenantId ?? '';
  if (organizationId.length === 0) {
    return '';
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu.test(organizationId)) {
    throw new BadRequestException('x-tenant-id must be a valid UUID');
  }
  return organizationId;
}

function defaultProviderTypeFor(channelType: CommunicationChannelType): CommunicationProviderType {
  return channelType === CommunicationChannelType.EMAIL
    ? CommunicationProviderType.RESEND
    : CommunicationProviderType.EVOLUTION;
}

/** Maps a provider failure onto the gateway timeout or bad gateway status. */
function toDeliveryException(providerError: string | null): Error {
  const errorCode = providerError ?? 'PROVIDER_FAILURE';
  return errorCode.toUpperCase().includes('TIMEOUT')
    ? new GatewayTimeoutException(errorCode)
    : new BadGatewayException(errorCode);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
