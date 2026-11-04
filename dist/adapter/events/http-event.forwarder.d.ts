import type { ForwarderConfig } from '../../communication-gateway/models/interfaces/forwarder-config.interface.js';
import type { MessageMappingStore } from '../../communication-gateway/models/interfaces/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../../communication-gateway/models/interfaces/outbound-event-publisher.port.js';
import type { WhatsappSupportRoute } from '../../communication-gateway/models/interfaces/whatsapp-support-route.interface.js';
export interface ForwarderTargets {
    readonly chatServiceUrl: string;
    readonly chatServiceApiKey: string;
    readonly notificationServiceUrl: string;
    readonly notificationServiceApiKey: string;
}
export declare class HttpEventForwarder {
    private readonly publisher;
    private readonly targets;
    private readonly mappingStore;
    private readonly config;
    private readonly chatServiceUrl;
    private readonly notificationServiceUrl;
    private readonly whatsappSupportEventMap;
    private inboundTask;
    private deliveryTask;
    private ready;
    constructor(publisher: OutboundEventPublisher, targets: ForwarderTargets, mappingStore: MessageMappingStore, config: ForwarderConfig, whatsappSupportEventMap: Readonly<Record<string, WhatsappSupportRoute>>);
    get isReady(): boolean;
    start(): Promise<void>;
    stop(): Promise<void>;
    private consumeInbound;
    private consumeDeliveries;
    private forwardInbound;
    private forwardDelivery;
    private postWithRetry;
}
export declare function backoffDelay(attempt: number, config: ForwarderConfig): number;
