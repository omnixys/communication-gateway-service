import type { OutboundMessage } from '../entities/outbound-message.model.js';
import type { ResolutionContext } from '../inputs/resolution-context.model.js';
import type { CommunicationProvider } from './communication-provider.port.js';
export interface ProviderResolver {
    resolve(message: OutboundMessage, context?: ResolutionContext): Promise<CommunicationProvider>;
}
