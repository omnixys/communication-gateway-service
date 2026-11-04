import type { MessageMapping } from '../entities/message-mapping.model.js';
import type { CommunicationProviderType, DeliveryStatus } from '../enums/gateway.enums.js';
export interface DeliveryFailureRecord {
    readonly internalId: string;
    readonly provider: CommunicationProviderType;
    readonly channel: string;
    readonly organizationId: string;
    readonly errorCode: string;
}
export interface MessageMappingStore {
    save(mapping: MessageMapping): Promise<void>;
    getByProviderMessageId(providerMessageId: string): Promise<MessageMapping | null>;
    getByInternalId(internalId: string): Promise<MessageMapping | null>;
    findByProviderAndProviderMessageId(provider: CommunicationProviderType, providerMessageId: string): Promise<MessageMapping | null>;
    updateStatus(providerMessageId: string, status: DeliveryStatus, error?: string | null): Promise<void>;
    incrementRetry(internalId: string): Promise<void>;
    recordFailure(record: DeliveryFailureRecord): Promise<void>;
    health(): Promise<boolean>;
}
