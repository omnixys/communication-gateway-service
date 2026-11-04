import type { ChannelCapabilities } from '../../communication-gateway/models/entities/channel-capabilities.model.js';
import type { CommunicationChannel } from '../../communication-gateway/models/entities/communication-channel.model.js';
import type { ProviderMetadata } from '../../communication-gateway/models/entities/provider-metadata.model.js';
import type { CommunicationProviderType } from '../../communication-gateway/models/enums/gateway.enums.js';
import type { ChannelEntry, ChannelProviderRegistry } from '../../communication-gateway/models/interfaces/channel-provider-registry.port.js';
import type { CommunicationProvider } from '../../communication-gateway/models/interfaces/communication-provider.port.js';
export declare class InMemoryChannelProviderRegistry implements ChannelProviderRegistry {
    private readonly channels;
    private readonly providers;
    private readonly disabled;
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
