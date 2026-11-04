import type { InboundMessage } from '../entities/inbound-message.model.js';
import type { CommunicationProviderType, ProviderStatus } from '../enums/gateway.enums.js';
import type { DeliveryReceipt } from './delivery-receipt.model.js';
export interface InboundMessageReceived {
    readonly kind: 'InboundMessageReceived';
    readonly message: InboundMessage;
}
export interface MessageDelivered {
    readonly kind: 'MessageDelivered';
    readonly receipt: DeliveryReceipt;
}
export interface ProviderStatusChanged {
    readonly kind: 'ProviderStatusChanged';
    readonly providerType: CommunicationProviderType;
    readonly status: ProviderStatus;
}
export type GatewayEvent = InboundMessageReceived | MessageDelivered | ProviderStatusChanged;
