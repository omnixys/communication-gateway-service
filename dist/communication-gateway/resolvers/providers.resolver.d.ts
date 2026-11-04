import type { ChannelProviderRegistry } from '../models/interfaces/channel-provider-registry.port.js';
export declare class ProviderStatus {
    provider_type: string;
    connected: boolean;
    health: boolean;
    last_error?: string | null;
    capabilities?: string[] | null;
}
export declare class GatewayHealth {
    status: string;
    provider_count: number;
    healthy_providers: number;
}
export declare class ProvidersResolver {
    private readonly registry;
    constructor(registry: ChannelProviderRegistry);
    providers(): Promise<ProviderStatus[]>;
    provider(providerType: string): Promise<ProviderStatus | null>;
    gatewayHealth(): Promise<GatewayHealth>;
}
