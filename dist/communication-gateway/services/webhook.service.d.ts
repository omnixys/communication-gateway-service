import type { CommunicationProviderType } from '../models/enums/gateway.enums.js';
import type { ChannelProviderRegistry } from '../models/interfaces/channel-provider-registry.port.js';
import type { MessageMappingStore } from '../models/interfaces/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../models/interfaces/outbound-event-publisher.port.js';
export type WebhookOutcome = 'INBOUND_MESSAGE' | 'DELIVERY_RECEIPT' | 'IGNORED';
export declare class WebhookService {
    private readonly registry;
    private readonly publisher;
    private readonly mappingStore;
    constructor(registry: ChannelProviderRegistry, publisher: OutboundEventPublisher, mappingStore: MessageMappingStore);
    processWebhook(providerType: CommunicationProviderType, headers: Readonly<Record<string, string>>, body: Buffer): Promise<WebhookOutcome>;
    private processInboundMessage;
    private processReceipt;
}
