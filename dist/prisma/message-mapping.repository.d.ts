import type { MessageMapping } from '../communication-gateway/models/entities/message-mapping.model.js';
import { DeliveryStatus } from '../communication-gateway/models/enums/gateway.enums.js';
import type { DeliveryFailureRecord, MessageMappingStore } from '../communication-gateway/models/interfaces/message-mapping-store.port.js';
import { PrismaService } from './prisma.service.js';
export declare class MessageMappingRepository implements MessageMappingStore {
    private readonly prisma;
    constructor(prisma: PrismaService);
    save(mapping: MessageMapping): Promise<void>;
    getByProviderMessageId(providerMessageId: string): Promise<MessageMapping | null>;
    getByInternalId(internalId: string): Promise<MessageMapping | null>;
    findByProviderAndProviderMessageId(provider: MessageMapping['provider'], providerMessageId: string): Promise<MessageMapping | null>;
    updateStatus(providerMessageId: string, status: DeliveryStatus, error?: string | null): Promise<void>;
    incrementRetry(internalId: string): Promise<void>;
    recordFailure(record: DeliveryFailureRecord): Promise<void>;
    health(): Promise<boolean>;
    private enqueue;
    private toDomain;
}
