import type { ChannelProviderRegistry } from '../models/interfaces/channel-provider-registry.port.js';
export interface ProviderListEntry {
    readonly provider_type: string;
    readonly enabled: boolean;
    readonly name?: string;
    readonly version?: string;
    readonly instance?: string | null;
    readonly api_version?: string | null;
    readonly supports_health?: boolean;
    readonly supports_webhooks?: boolean;
}
export interface ProviderHealthResponse {
    readonly status: string;
    readonly provider: string;
    readonly error?: string;
}
export declare class ProvidersController {
    private readonly registry;
    constructor(registry: ChannelProviderRegistry);
    list(): ProviderListEntry[];
    health(raw: string): Promise<ProviderHealthResponse>;
}
