var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadGatewayException, BadRequestException, GatewayTimeoutException, Inject, Injectable, ServiceUnavailableException, UnprocessableEntityException, } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { MESSAGE_MAPPING_STORE } from '../../prisma/tokens.js';
import { AddressResolutionError } from '../errors/gateway.errors.js';
import { createMessageMapping } from '../models/entities/message-mapping.model.js';
import { CommunicationChannelType, CommunicationProviderType, ContentType, parseCommunicationChannelType, } from '../models/enums/gateway.enums.js';
import { toIdentityResponse } from '../models/mappers/provider-identity.mapper.js';
import { ADDRESS_RESOLVER } from '../utils/tokens.js';
import { GatewayDispatcher } from './gateway-dispatcher.service.js';
import { ContextAccessor } from '@omnixys/context-ts';
const logger = getLogger('MessagesService', 'class');
let MessagesService = class MessagesService {
    dispatcher;
    mappingStore;
    addressResolver;
    constructor(dispatcher, mappingStore, addressResolver) {
        this.dispatcher = dispatcher;
        this.mappingStore = mappingStore;
        this.addressResolver = addressResolver;
    }
    async send(dto) {
        const channelType = parseCommunicationChannelType(dto.channel);
        validateChannelFields(dto, channelType);
        const recipientId = dto.recipientId ?? '';
        logger.info({ messageId: dto.id, channel: dto.channel, recipientId }, 'send_message_request');
        const recipientAddress = dto.recipientAddress ?? (await this.resolveAddress(recipientId, channelType));
        const organizationId = resolveOrganizationId();
        const metadata = buildMetadata(dto, organizationId);
        const context = {
            tenantId: organizationId.length > 0 ? organizationId : null,
            deploymentId: null,
            metadata,
        };
        const message = {
            id: dto.id,
            channel: { type: channelType },
            to: recipientAddress,
            body: dto.body,
            contentType: dto.contentType ?? ContentType.TEXT,
            attachment: null,
            metadata,
        };
        const result = await this.dispatcher.dispatch(message, context);
        const providerType = result.providerIdentity?.providerType ?? defaultProviderTypeFor(channelType);
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
        logger.info({
            messageId: dto.id,
            providerMessageId: result.providerMessageId,
            channel: dto.channel,
        }, 'send_message_success');
        return {
            success: result.success,
            providerMessageId: result.providerMessageId,
            status: result.status,
            error: result.error,
            providerIdentity: toIdentityResponse(result.providerIdentity),
        };
    }
    async resolveAddress(recipientId, channelType) {
        try {
            return await this.addressResolver.resolve(recipientId, channelType);
        }
        catch (error) {
            const message = error instanceof AddressResolutionError || error instanceof Error
                ? error.message
                : String(error);
            logger.warn({ recipientId, channel: channelType, error: message }, 'address_resolution_failed');
            throw new UnprocessableEntityException({
                message,
                error: 'ADDRESS_RESOLUTION_FAILED',
            });
        }
    }
    async recordFailure(internalId, providerType, channelType, organizationId, providerError) {
        const errorCode = providerError ?? 'PROVIDER_FAILURE';
        try {
            await this.mappingStore.recordFailure({
                internalId,
                provider: providerType,
                channel: channelType,
                organizationId,
                errorCode,
            });
        }
        catch (error) {
            logger.error({ messageId: internalId, error: toMessage(error) }, 'failed_to_record_delivery_failure');
        }
        logger.warn({ messageId: internalId, channel: channelType, error: errorCode }, 'send_message_failed');
    }
    async saveMapping(input) {
        const { dto, metadata } = input;
        try {
            await this.mappingStore.save(createMessageMapping({
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
            }));
        }
        catch (error) {
            logger.error({ messageId: dto.id, error: toMessage(error) }, 'failed_to_save_message_mapping');
            throw new ServiceUnavailableException('DELIVERY_STATE_PERSISTENCE_FAILED');
        }
    }
};
MessagesService = __decorate([
    Injectable(),
    __param(1, Inject(MESSAGE_MAPPING_STORE)),
    __param(2, Inject(ADDRESS_RESOLVER)),
    __metadata("design:paramtypes", [GatewayDispatcher, Object, Object])
], MessagesService);
export { MessagesService };
function validateChannelFields(dto, channelType) {
    const hasRecipient = (dto.recipientAddress !== undefined && dto.recipientAddress.length > 0) ||
        (dto.recipientId !== undefined && dto.recipientId.length > 0);
    if (!hasRecipient) {
        throw new BadRequestException('recipientAddress or recipientId is required');
    }
    if (channelType === CommunicationChannelType.EMAIL &&
        (dto.subject === undefined || dto.subject.length === 0)) {
        throw new BadRequestException('subject is required for EMAIL');
    }
    if (channelType === CommunicationChannelType.WHATSAPP &&
        dto.contentType !== undefined &&
        dto.contentType !== 'TEXT') {
        throw new BadRequestException('WHATSAPP supports TEXT only in V1');
    }
}
function buildMetadata(dto, organizationId) {
    const metadata = { ...(dto.metadata ?? {}) };
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
function resolveOrganizationId() {
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
function defaultProviderTypeFor(channelType) {
    return channelType === CommunicationChannelType.EMAIL
        ? CommunicationProviderType.RESEND
        : CommunicationProviderType.EVOLUTION;
}
function toDeliveryException(providerError) {
    const errorCode = providerError ?? 'PROVIDER_FAILURE';
    return errorCode.toUpperCase().includes('TIMEOUT')
        ? new GatewayTimeoutException(errorCode)
        : new BadGatewayException(errorCode);
}
function readString(value) {
    return typeof value === 'string' ? value : '';
}
function toMessage(error) {
    return error instanceof Error ? error.message : String(error);
}
