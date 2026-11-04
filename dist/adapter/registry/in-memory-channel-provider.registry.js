import { getLogger } from '@omnixys/logger-ts';
import { ChannelNotFoundError } from '../../communication-gateway/errors/gateway.errors.js';
import { mergeChannelCapabilities } from '../../communication-gateway/models/entities/channel-capabilities.model.js';
const logger = getLogger('InMemoryChannelProviderRegistry', 'class');
export class InMemoryChannelProviderRegistry {
    channels = new Map();
    providers = new Map();
    disabled = new Set();
    registerChannel(channel, entry) {
        if (this.channels.has(channel.type)) {
            throw new Error(`Channel already registered: ${channel.type}`);
        }
        this.channels.set(channel.type, entry);
        for (const provider of entry.providers) {
            this.providers.set(provider.providerType, provider);
        }
    }
    getByChannel(channel) {
        const entry = this.channels.get(channel.type);
        if (entry === undefined) {
            throw new ChannelNotFoundError(channel.type);
        }
        return entry;
    }
    getByProviderType(providerType) {
        if (this.disabled.has(providerType)) {
            return null;
        }
        return this.providers.get(providerType) ?? null;
    }
    listChannels() {
        return [...this.channels.keys()].map((type) => ({ type }));
    }
    listProviders() {
        return [...this.providers.values()];
    }
    enableProvider(providerType) {
        this.disabled.delete(providerType);
    }
    disableProvider(providerType) {
        this.disabled.add(providerType);
    }
    isProviderEnabled(providerType) {
        return !this.disabled.has(providerType);
    }
    getProvidersByChannel(channel) {
        const entry = this.channels.get(channel.type);
        if (entry === undefined) {
            return [];
        }
        return entry.providers.filter((provider) => !this.disabled.has(provider.providerType));
    }
    async getChannelCapabilities(channel) {
        const capabilitySets = [];
        for (const provider of this.getProvidersByChannel(channel)) {
            try {
                capabilitySets.push(await provider.capabilities());
            }
            catch (error) {
                logger.warn({
                    provider: provider.providerType,
                    error: error instanceof Error ? error.message : String(error),
                }, 'provider capabilities could not be read');
            }
        }
        return mergeChannelCapabilities(...capabilitySets);
    }
    getProviderMetadata(providerType) {
        const provider = this.providers.get(providerType);
        if (provider === undefined) {
            return null;
        }
        try {
            return provider.metadata;
        }
        catch (error) {
            logger.warn({
                provider: providerType,
                error: error instanceof Error ? error.message : String(error),
            }, 'provider metadata could not be read');
            return null;
        }
    }
}
