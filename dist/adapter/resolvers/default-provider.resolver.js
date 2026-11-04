import { getLogger } from '@omnixys/logger-ts';
import { NoProviderAvailableError } from '../../communication-gateway/errors/gateway.errors.js';
const logger = getLogger('DefaultProviderResolver', 'class');
export class DefaultProviderResolver {
    providers;
    fallbackProviders;
    constructor(providers, fallbackProviders = []) {
        this.providers = providers;
        this.fallbackProviders = fallbackProviders;
    }
    async resolve(message, _context) {
        for (const provider of this.providers) {
            if (await this.isHealthy(provider, 'provider unavailable')) {
                return provider;
            }
        }
        for (const provider of this.fallbackProviders) {
            if (await this.isHealthy(provider, 'fallback provider unavailable')) {
                logger.info({ provider: provider.providerType, channel: message.channel.type }, 'using fallback provider');
                return provider;
            }
        }
        logger.warn({ channel: message.channel.type }, 'no healthy provider available');
        throw new NoProviderAvailableError(message.channel.type);
    }
    async isHealthy(provider, reason) {
        try {
            const healthy = await provider.health();
            if (!healthy) {
                logger.warn({ provider: provider.providerType }, reason);
            }
            return healthy;
        }
        catch (error) {
            logger.warn({
                provider: provider.providerType,
                error: error instanceof Error ? error.message : String(error),
            }, 'provider health check failed');
            return false;
        }
    }
}
