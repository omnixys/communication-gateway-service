import type { MessageMapping } from '../entities/message-mapping.model.js';
import { DeliveryStatus } from '../enums/gateway.enums.js';
export interface RawEventPublisher {
    readonly enabled: boolean;
    publishRaw(topic: string, value: string, key?: string, headers?: Readonly<Record<string, string>>): Promise<void>;
    shutdown(): Promise<void>;
}
export declare const ANALYTICS_DELIVERY_SUCCEEDED_TOPIC = "communication.delivery.succeeded.v1";
export declare const ANALYTICS_DELIVERY_FAILED_TOPIC = "communication.delivery.failed.v1";
export declare const ANALYTICS_TERMINAL_STATUSES: ReadonlySet<DeliveryStatus>;
export interface AnalyticsOutboxPort {
    enqueueDeliveryFact(mapping: Pick<MessageMapping, 'internalId' | 'channel' | 'conversationId' | 'provider' | 'organizationId'>, status: DeliveryStatus): Promise<void>;
}
