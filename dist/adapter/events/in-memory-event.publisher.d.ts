import type { OutboundEventPublisher } from '../../communication-gateway/models/interfaces/outbound-event-publisher.port.js';
import type { GatewayEvent } from '../../communication-gateway/models/payloads/gateway-events.payload.js';
export declare class InMemoryEventPublisher implements OutboundEventPublisher {
    private readonly subscribers;
    publish(event: GatewayEvent): Promise<void>;
    subscribe(kind: GatewayEvent['kind']): AsyncGenerator<GatewayEvent>;
    close(): Promise<void>;
    private iterate;
    private remove;
}
