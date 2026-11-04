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
import { BadRequestException, Controller, Get, Inject, Param } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { parseCommunicationProviderType, } from '../models/enums/gateway.enums.js';
import { CHANNEL_PROVIDER_REGISTRY } from '../utils/tokens.js';
const logger = getLogger('ProvidersController', 'class');
let ProvidersController = class ProvidersController {
    registry;
    constructor(registry) {
        this.registry = registry;
    }
    list() {
        return this.registry.listProviders().map((provider) => {
            const base = {
                provider_type: provider.providerType,
                enabled: this.registry.isProviderEnabled(provider.providerType),
            };
            try {
                const metadata = provider.metadata;
                return {
                    ...base,
                    name: metadata.identity.name,
                    version: metadata.identity.version,
                    instance: metadata.identity.instance,
                    api_version: metadata.identity.apiVersion,
                    supports_health: metadata.supportsHealth,
                    supports_webhooks: metadata.supportsWebhooks,
                };
            }
            catch (error) {
                logger.warn({
                    provider: provider.providerType,
                    error: error instanceof Error ? error.message : String(error),
                }, 'provider metadata unavailable');
                return base;
            }
        });
    }
    async health(raw) {
        const providerType = parseProviderType(raw);
        const provider = this.registry.getByProviderType(providerType);
        if (provider === null) {
            return {
                status: 'unknown',
                provider: providerType,
                error: `Provider ${providerType} not found`,
            };
        }
        return probe(provider);
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Array)
], ProvidersController.prototype, "list", null);
__decorate([
    Get(':providerType/health'),
    __param(0, Param('providerType')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProvidersController.prototype, "health", null);
ProvidersController = __decorate([
    Controller('api/v1/providers'),
    __param(0, Inject(CHANNEL_PROVIDER_REGISTRY)),
    __metadata("design:paramtypes", [Object])
], ProvidersController);
export { ProvidersController };
function parseProviderType(raw) {
    try {
        return parseCommunicationProviderType(raw);
    }
    catch {
        throw new BadRequestException(`Unknown provider type: ${raw}`);
    }
}
async function probe(provider) {
    try {
        const healthy = await provider.health();
        return {
            status: healthy ? 'ok' : 'unavailable',
            provider: provider.providerType,
        };
    }
    catch (error) {
        if (error instanceof Error && error.name === 'NotImplementedError') {
            return { status: 'not_implemented', provider: provider.providerType };
        }
        const message = error instanceof Error ? error.message : String(error);
        logger.warn({ provider: provider.providerType, error: message }, 'provider health check failed');
        return { status: 'error', provider: provider.providerType, error: message };
    }
}
