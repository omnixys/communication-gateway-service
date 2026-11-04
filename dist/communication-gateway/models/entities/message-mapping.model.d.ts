import { DeliveryStatus } from '../enums/gateway.enums.js';
import type { CommunicationChannelType, CommunicationProviderType } from '../enums/gateway.enums.js';
export interface MessageMapping {
    internalId: string;
    providerMessageId: string;
    provider: CommunicationProviderType;
    channel: CommunicationChannelType;
    conversationId: string;
    sender: string;
    recipient: string;
    status: DeliveryStatus;
    tenantId: string;
    organizationId: string;
    providerInstance: string;
    retryCount: number;
    lastStatusChange: Date | null;
    lastError: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: Date;
    updatedAt: Date | null;
}
export declare function createMessageMapping(seed: Pick<MessageMapping, 'internalId' | 'providerMessageId' | 'provider' | 'channel' | 'conversationId'> & Partial<MessageMapping>): MessageMapping;
