import type { ChannelCapabilities } from '../entities/channel-capabilities.model.js';
import type { CommunicationChannel } from '../entities/communication-channel.model.js';
import type { ProviderMetadata } from '../entities/provider-metadata.model.js';
import type { CommunicationProviderType } from '../enums/gateway.enums.js';
import type { CommunicationProvider } from './communication-provider.port.js';
import type { ProviderResolver } from './provider-resolver.port.js';
export interface ChannelEntry {
    readonly resolver: ProviderResolver;
    readonly providers: readonly CommunicationProvider[];
}
export interface ChannelProviderRegistry {
    registerChannel(channel: CommunicationChannel, entry: ChannelEntry): void;
    getByChannel(channel: CommunicationChannel): ChannelEntry;
    getByProviderType(providerType: CommunicationProviderType): CommunicationProvider | null;
    listChannels(): CommunicationChannel[];
    listProviders(): CommunicationProvider[];
    enableProvider(providerType: CommunicationProviderType): void;
    disableProvider(providerType: CommunicationProviderType): void;
    isProviderEnabled(providerType: CommunicationProviderType): boolean;
    getProvidersByChannel(channel: CommunicationChannel): CommunicationProvider[];
    getChannelCapabilities(channel: CommunicationChannel): Promise<ChannelCapabilities>;
    getProviderMetadata(providerType: CommunicationProviderType): ProviderMetadata | null;
}
