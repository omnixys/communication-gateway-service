import type { ProviderSelectionConfig } from '../../communication-gateway/models/interfaces/provider-selection-config.interface.js';
import { InMemoryChannelProviderRegistry } from '../registry/in-memory-channel-provider.registry.js';
export declare function buildChannelRegistry(config: ProviderSelectionConfig): InMemoryChannelProviderRegistry;
export declare function closeProviders(registry: InMemoryChannelProviderRegistry): Promise<void>;
