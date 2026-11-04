import type { OutboundMessage } from '../../communication-gateway/models/entities/outbound-message.model.js';
import type { ResolutionContext } from '../../communication-gateway/models/inputs/resolution-context.model.js';
import type { CommunicationProvider } from '../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { ProviderResolver } from '../../communication-gateway/models/interfaces/provider-resolver.port.js';
export declare class DefaultProviderResolver implements ProviderResolver {
    private readonly providers;
    private readonly fallbackProviders;
    constructor(providers: readonly CommunicationProvider[], fallbackProviders?: readonly CommunicationProvider[]);
    resolve(message: OutboundMessage, _context?: ResolutionContext): Promise<CommunicationProvider>;
    private isHealthy;
}
