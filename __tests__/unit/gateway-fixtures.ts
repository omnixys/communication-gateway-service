import type { SendMessageDto } from '../../dist/communication-gateway/models/dto/send-message.dto.js';
import type { MessageMapping } from '../../dist/communication-gateway/models/entities/message-mapping.model.js';
import type { ProviderResponse } from '../../dist/communication-gateway/models/payloads/provider-response.model.js';
import '../support/env.mjs';

export const {
  CommunicationChannelType,
  CommunicationProviderType,
  DeliveryStatus,
  ContentType,
} =
  await import('../../dist/communication-gateway/models/enums/gateway.enums.js');
export const NOW = new Date('2026-10-03T10:00:00Z');
export const ORGANIZATION = '22222222-2222-4222-8222-222222222222';
export const DATABASE_ID = '33333333-3333-4333-8333-333333333333';
export const ACTOR = '019a08da-6000-7000-8000-000000000001';
export const mapping: MessageMapping = {
  internalId: 'unit-message',
  providerMessageId: 'provider-message',
  provider: CommunicationProviderType.EVOLUTION,
  channel: CommunicationChannelType.WHATSAPP,
  conversationId: 'unit-conversation',
  sender: ACTOR,
  recipient: '+4930123456',
  status: DeliveryStatus.SENT,
  tenantId: ORGANIZATION,
  organizationId: ORGANIZATION,
  providerInstance: 'unit-provider',
  retryCount: 0,
  lastStatusChange: null,
  lastError: null,
  metadata: { conversationId: 'unit-conversation' },
  createdAt: NOW,
  updatedAt: null,
};
export const dto: SendMessageDto = {
  id: mapping.internalId,
  channel: 'WHATSAPP',
  recipientId: ACTOR,
  body: 'Unit message',
  senderId: ACTOR,
};
export const response: ProviderResponse = {
  success: true,
  providerMessageId: mapping.providerMessageId,
  status: DeliveryStatus.SENT,
  error: null,
  raw: { private: 'provider-internals' },
  providerIdentity: {
    name: 'Unit provider',
    providerType: CommunicationProviderType.EVOLUTION,
    version: '1',
    instance: 'unit',
    apiVersion: 'v1',
  },
};
