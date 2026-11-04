import type { CommunicationProviderType, DeliveryStatus } from '../enums/gateway.enums.js';
export interface DeliveryReceipt {
    readonly messageId: string;
    readonly providerMessageId: string;
    readonly providerType: CommunicationProviderType;
    readonly status: DeliveryStatus;
    readonly timestamp: Date;
    readonly error: string | null;
}
