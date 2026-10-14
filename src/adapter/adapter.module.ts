import {
  ADDRESS_RESOLVER,
  CHANNEL_PROVIDER_REGISTRY,
} from '../communication-gateway/utils/tokens.js';
import { env } from '../config/env.js';
import { ProviderLifecycle } from './providers/provider-lifecycle.service.js';
import { buildChannelRegistry } from './providers/provider-registry.factory.js';
import type { InMemoryChannelProviderRegistry } from './registry/in-memory-channel-provider.registry.js';
import { DictAddressResolver } from './resolvers/dict-address.resolver.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: CHANNEL_PROVIDER_REGISTRY,
      useFactory: (): InMemoryChannelProviderRegistry =>
        buildChannelRegistry({
          evolution: {
            baseUrl: env.EVOLUTION_BASE_URL,
            apiKey: env.EVOLUTION_API_KEY,
            instanceName: env.EVOLUTION_INSTANCE_NAME,
            webhookSecret: env.EVOLUTION_WEBHOOK_SECRET,
          },
          resend: {
            apiKey: env.RESEND_API_KEY,
            fromAddress: env.RESEND_FROM_ADDRESS,
            baseUrl: env.RESEND_BASE_URL,
            timeout: env.RESEND_TIMEOUT,
          },
          stalwart: {
            enabled: env.STALWART_ENABLED,
            priority: env.STALWART_PRIORITY,
            timeout: env.STALWART_TIMEOUT,
            host: env.STALWART_HOST,
            port: env.STALWART_PORT,
            username: env.STALWART_USERNAME,
            password: env.STALWART_PASSWORD,
            authMode: env.STALWART_AUTH_MODE,
            oauthTokenUrl: env.STALWART_OAUTH_TOKEN_URL,
            oauthClientId: env.STALWART_OAUTH_CLIENT_ID,
            oauthClientSecret: env.STALWART_OAUTH_CLIENT_SECRET,
            fromAddress: env.STALWART_FROM_ADDRESS,
            tlsEnabled: env.STALWART_TLS_ENABLED,
            tlsVerify: env.STALWART_TLS_VERIFY,
          },
          emailPrimary: env.EMAIL_PRIMARY,
          emailFallback: env.EMAIL_FALLBACK,
        }),
    },
    {
      provide: ADDRESS_RESOLVER,
      useFactory: (): DictAddressResolver => new DictAddressResolver(env.ADDRESS_MAPPINGS),
    },
    ProviderLifecycle,
  ],
  exports: [CHANNEL_PROVIDER_REGISTRY, ADDRESS_RESOLVER],
})
export class AdapterModule {}
