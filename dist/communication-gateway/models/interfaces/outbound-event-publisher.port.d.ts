import type { GatewayEvent } from '../payloads/gateway-events.payload.js';
export interface OutboundEventPublisher {
    publish(event: GatewayEvent): Promise<void>;
    subscribe(kind: GatewayEvent['kind']): AsyncIterable<GatewayEvent>;
    close(): Promise<void>;
}
