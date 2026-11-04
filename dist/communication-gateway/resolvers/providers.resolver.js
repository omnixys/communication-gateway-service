var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Inject, Injectable } from '@nestjs/common';
import { Args, Field, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { getLogger } from '@omnixys/logger-ts';
import { CHANNEL_CAPABILITY_KEYS } from '../models/entities/channel-capabilities.model.js';
import { parseCommunicationProviderType } from '../models/enums/gateway.enums.js';
import { CHANNEL_PROVIDER_REGISTRY } from '../utils/tokens.js';
const logger = getLogger('ProvidersResolver', 'class');
let ProviderStatus = class ProviderStatus {
    provider_type;
    connected;
    health;
    last_error;
    capabilities;
};
__decorate([
    Field(() => String, { description: 'Registered provider type' }),
    __metadata("design:type", String)
], ProviderStatus.prototype, "provider_type", void 0);
__decorate([
    Field(() => Boolean, {
        description: 'Whether the provider answered a health probe',
    }),
    __metadata("design:type", Boolean)
], ProviderStatus.prototype, "connected", void 0);
__decorate([
    Field(() => Boolean, { description: 'Alias of connected, kept for parity' }),
    __metadata("design:type", Boolean)
], ProviderStatus.prototype, "health", void 0);
__decorate([
    Field(() => String, { nullable: true }),
    __metadata("design:type", Object)
], ProviderStatus.prototype, "last_error", void 0);
__decorate([
    Field(() => [String], {
        nullable: true,
        description: 'Enabled capability names without the supports_ prefix',
    }),
    __metadata("design:type", Object)
], ProviderStatus.prototype, "capabilities", void 0);
ProviderStatus = __decorate([
    ObjectType({ description: 'Health and capabilities of a channel provider' })
], ProviderStatus);
export { ProviderStatus };
let GatewayHealth = class GatewayHealth {
    status;
    provider_count;
    healthy_providers;
};
__decorate([
    Field(() => String),
    __metadata("design:type", String)
], GatewayHealth.prototype, "status", void 0);
__decorate([
    Field(() => Int),
    __metadata("design:type", Number)
], GatewayHealth.prototype, "provider_count", void 0);
__decorate([
    Field(() => Int),
    __metadata("design:type", Number)
], GatewayHealth.prototype, "healthy_providers", void 0);
GatewayHealth = __decorate([
    ObjectType({ description: 'Aggregated health of the gateway' })
], GatewayHealth);
export { GatewayHealth };
let ProvidersResolver = class ProvidersResolver {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    async providers() {
        return Promise.all(this.registry.listProviders().map(async (provider) => toStatus(provider)));
    }
    async provider(providerType) {
        const type = tryParse(providerType);
        if (type === null) {
            return null;
        }
        const provider = this.registry.getByProviderType(type);
        return provider === null ? null : toStatus(provider);
    }
    async gatewayHealth() {
        const providers = this.registry.listProviders();
        const results = await Promise.all(providers.map(probeHealth));
        const healthy = results.filter(Boolean).length;
        return {
            status: healthy === providers.length ? 'healthy' : 'degraded',
            provider_count: providers.length,
            healthy_providers: healthy,
        };
    }
};
__decorate([
    Query(() => [ProviderStatus], { name: 'providers' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProvidersResolver.prototype, "providers", null);
__decorate([
    Query(() => ProviderStatus, { name: 'provider', nullable: true }),
    __param(0, Args('provider_type', { type: () => String })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProvidersResolver.prototype, "provider", null);
__decorate([
    Query(() => GatewayHealth, { name: 'gatewayHealth' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProvidersResolver.prototype, "gatewayHealth", null);
ProvidersResolver = __decorate([
    Resolver(() => ProviderStatus),
    Injectable(),
    __param(0, Inject(CHANNEL_PROVIDER_REGISTRY)),
    __metadata("design:paramtypes", [Object])
], ProvidersResolver);
export { ProvidersResolver };
async function toStatus(provider) {
    const healthy = await probeHealth(provider);
    let capabilities = [];
    try {
        const capabilitySet = await provider.capabilities();
        capabilities = CHANNEL_CAPABILITY_KEYS.filter((key) => capabilitySet[key]).map((key) => key.replace('supports_', ''));
    }
    catch (error) {
        logger.warn({
            provider: provider.providerType,
            error: error instanceof Error ? error.message : String(error),
        }, 'provider capabilities unavailable');
    }
    return {
        provider_type: provider.providerType,
        connected: healthy,
        health: healthy,
        last_error: null,
        capabilities,
    };
}
async function probeHealth(provider) {
    try {
        return await provider.health();
    }
    catch (error) {
        if (error instanceof Error && error.name === 'NotImplementedError') {
            return false;
        }
        logger.warn({
            provider: provider.providerType,
            error: error instanceof Error ? error.message : String(error),
        }, 'provider health check failed');
        return false;
    }
}
function tryParse(value) {
    try {
        return parseCommunicationProviderType(value);
    }
    catch {
        return null;
    }
}
