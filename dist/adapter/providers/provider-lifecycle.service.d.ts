import { type OnApplicationShutdown } from '@nestjs/common';
import type { InMemoryChannelProviderRegistry } from '../registry/in-memory-channel-provider.registry.js';
export declare class ProviderLifecycle implements OnApplicationShutdown {
    private readonly registry;
    constructor(registry: InMemoryChannelProviderRegistry);
    onApplicationShutdown(): Promise<void>;
}
