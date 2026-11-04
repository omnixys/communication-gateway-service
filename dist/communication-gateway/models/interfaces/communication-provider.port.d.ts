import type { ChannelCapabilities } from '../entities/channel-capabilities.model.js';
import type { InboundMessage } from '../entities/inbound-message.model.js';
import type { OutboundMessage } from '../entities/outbound-message.model.js';
import type { ProviderMetadata } from '../entities/provider-metadata.model.js';
import type { CommunicationProviderType } from '../enums/gateway.enums.js';
import type { DeliveryReceipt } from '../payloads/delivery-receipt.model.js';
import type { ProviderResponse } from '../payloads/provider-response.model.js';
export type WebhookResult = {
    readonly kind: 'inboundMessage';
    readonly message: InboundMessage;
} | {
    readonly kind: 'deliveryReceipt';
    readonly receipt: DeliveryReceipt;
} | {
    readonly kind: 'ignored';
};
export interface CommunicationProvider {
    readonly providerType: CommunicationProviderType;
    readonly metadata: ProviderMetadata;
    send(message: OutboundMessage): Promise<ProviderResponse>;
    health(): Promise<boolean>;
    capabilities(): Promise<ChannelCapabilities>;
    verifyWebhook(headers: Readonly<Record<string, string>>, body: Buffer): Promise<boolean>;
    handleWebhook(headers: Readonly<Record<string, string>>, body: Buffer): Promise<WebhookResult>;
    close?(): Promise<void>;
}
