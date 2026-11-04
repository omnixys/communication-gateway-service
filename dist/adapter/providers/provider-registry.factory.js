import { getLogger } from '@omnixys/logger-ts';
import { CommunicationChannelType } from '../../communication-gateway/models/enums/gateway.enums.js';
import { InMemoryChannelProviderRegistry } from '../registry/in-memory-channel-provider.registry.js';
import { DefaultProviderResolver } from '../resolvers/default-provider.resolver.js';
import { EvolutionProvider } from './evolution/evolution.provider.js';
import { ResendProvider } from './resend/resend.provider.js';
import { StalwartProvider } from './stalwart/stalwart.provider.js';
const logger = getLogger('ProviderRegistryFactory', 'util');
export function buildChannelRegistry(config) {
    const registry = new InMemoryChannelProviderRegistry();
    const registered = [];
    registerChannel(registry, CommunicationChannelType.WHATSAPP, [new EvolutionProvider(config.evolution)], []);
    registered.push('WHATSAPP=EVOLUTION');
    const primary = createEmailProvider(config.emailPrimary, config);
    const fallback = createEmailProvider(config.emailFallback, config);
    if (primary !== null) {
        const fallbacks = fallback === null || primary.providerType === fallback.providerType
            ? []
            : [fallback];
        registerChannel(registry, CommunicationChannelType.EMAIL, [primary], fallbacks);
        registered.push(`EMAIL=${primary.providerType}${fallbacks.length > 0 ? `+${String(fallbacks[0]?.providerType)}` : ''}`);
    }
    else {
        logger.warn({ emailPrimary: config.emailPrimary }, 'no email provider configured, EMAIL channel not registered');
    }
    logger.info({ registered }, 'channel providers registered');
    return registry;
}
export async function closeProviders(registry) {
    await Promise.all(registry.listProviders().map(async (provider) => {
        if (provider.close === undefined) {
            return;
        }
        try {
            await provider.close();
        }
        catch (error) {
            logger.warn({
                provider: provider.providerType,
                error: error instanceof Error ? error.message : String(error),
            }, 'provider close failed');
        }
    }));
}
function registerChannel(registry, channel, providers, fallbacks) {
    const entry = {
        resolver: new DefaultProviderResolver(providers, fallbacks),
        providers: [...providers, ...fallbacks],
    };
    registry.registerChannel({ type: channel }, entry);
}
function createEmailProvider(name, config) {
    switch (name) {
        case 'resend':
            return new ResendProvider(config.resend);
        case 'stalwart':
            return config.stalwart.enabled
                ? new StalwartProvider(config.stalwart)
                : null;
        case 'none':
            return null;
    }
}
