import type { OutboundMessage } from '../models/entities/outbound-message.model.js';
import type { ResolutionContext } from '../models/inputs/resolution-context.model.js';
import type { ChannelProviderRegistry } from '../models/interfaces/channel-provider-registry.port.js';
import type { ProviderResponse } from '../models/payloads/provider-response.model.js';
export declare class GatewayDispatcher {
    private readonly registry;
    constructor(registry: ChannelProviderRegistry);
    dispatch(message: OutboundMessage, context?: ResolutionContext): Promise<ProviderResponse>;
}
