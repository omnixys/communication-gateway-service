import type { MessageMappingStore } from '../../communication-gateway/models/interfaces/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../../communication-gateway/models/interfaces/outbound-event-publisher.port.js';
import type { RawEventPublisher } from '../../communication-gateway/models/interfaces/raw-event-publisher.port.js';
export declare const DELIVERY_STATUS_TOPIC = "gateway.delivery.status";
export declare class KafkaDeliveryEventHandler {
    private readonly publisher;
    private readonly producer;
    private readonly mappingStore;
    private task;
    constructor(publisher: OutboundEventPublisher, producer: RawEventPublisher, mappingStore: MessageMappingStore);
    start(): Promise<void>;
    stop(): Promise<void>;
    private run;
    private publish;
}
