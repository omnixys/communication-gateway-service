var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { ADDRESS_RESOLVER, CHANNEL_PROVIDER_REGISTRY, } from '../communication-gateway/utils/tokens.js';
import { env } from '../config/env.js';
import { ProviderLifecycle } from './providers/provider-lifecycle.service.js';
import { buildChannelRegistry } from './providers/provider-registry.factory.js';
import { DictAddressResolver } from './resolvers/dict-address.resolver.js';
import { Module } from '@nestjs/common';
let AdapterModule = class AdapterModule {
};
AdapterModule = __decorate([
    Module({
        providers: [
            {
                provide: CHANNEL_PROVIDER_REGISTRY,
                useFactory: () => buildChannelRegistry({
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
                useFactory: () => new DictAddressResolver(env.ADDRESS_MAPPINGS),
            },
            ProviderLifecycle,
        ],
        exports: [CHANNEL_PROVIDER_REGISTRY, ADDRESS_RESOLVER],
    })
], AdapterModule);
export { AdapterModule };
