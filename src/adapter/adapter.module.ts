import {
  ADDRESS_RESOLVER,
  CHANNEL_PROVIDER_REGISTRY,
} from '../communication-gateway/shared/tokens.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/config.types.js';
import { ProviderLifecycle } from './providers/provider-lifecycle.service.js';
import { buildChannelRegistry } from './providers/provider-registry.factory.js';
import type { InMemoryChannelProviderRegistry } from './registry/in-memory-channel-provider.registry.js';
import { DictAddressResolver } from './resolvers/dict-address.resolver.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: CHANNEL_PROVIDER_REGISTRY,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): InMemoryChannelProviderRegistry =>
        buildChannelRegistry(config),
    },
    {
      provide: ADDRESS_RESOLVER,
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig): DictAddressResolver =>
        new DictAddressResolver(config.core.addressMappings),
    },
    ProviderLifecycle,
  ],
  exports: [CHANNEL_PROVIDER_REGISTRY, ADDRESS_RESOLVER],
})
export class AdapterModule {}
