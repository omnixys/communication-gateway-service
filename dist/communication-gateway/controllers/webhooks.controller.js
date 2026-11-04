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
import { BadRequestException, Controller, Get, Headers, HttpCode, HttpStatus, Inject, MethodNotAllowedException, Param, Post, Req, UnprocessableEntityException, UnauthorizedException, } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { Public } from '../../security/public.decorator.js';
import { WebhookVerificationError } from '../errors/gateway.errors.js';
import { parseCommunicationProviderType, } from '../models/enums/gateway.enums.js';
import { WEBHOOK_SERVICE } from '../utils/tokens.js';
const logger = getLogger('WebhooksController', 'class');
let WebhooksController = class WebhooksController {
    webhooks;
    constructor(webhooks) {
        this.webhooks = webhooks;
    }
    async receive(raw, headers, request) {
        const providerType = parseProviderType(raw);
        const body = request.rawBody;
        if (body === undefined) {
            logger.error({ providerType }, 'raw body unavailable, the application must be created with rawBody enabled');
            throw new BadRequestException('RAW_BODY_UNAVAILABLE');
        }
        logger.info({ providerType, bytes: body.length }, 'webhook_received');
        let outcome;
        try {
            outcome = await this.webhooks.processWebhook(providerType, lowercaseHeaders(headers), body);
        }
        catch (error) {
            if (error instanceof WebhookVerificationError) {
                logger.warn({ providerType }, 'webhook_verification_failed');
                throw new UnauthorizedException('WEBHOOK_VERIFICATION_FAILED');
            }
            throw error;
        }
        logger.info({ providerType, result: outcome }, 'webhook_processed');
        return { received: true, result: outcome };
    }
    challenge() {
        throw new MethodNotAllowedException('CHALLENGE_NOT_SUPPORTED');
    }
};
__decorate([
    Post(':providerType'),
    HttpCode(HttpStatus.OK),
    __param(0, Param('providerType')),
    __param(1, Headers()),
    __param(2, Req()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], WebhooksController.prototype, "receive", null);
__decorate([
    Get(':providerType'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], WebhooksController.prototype, "challenge", null);
WebhooksController = __decorate([
    Controller('webhooks'),
    Public(),
    __param(0, Inject(WEBHOOK_SERVICE)),
    __metadata("design:paramtypes", [Function])
], WebhooksController);
export { WebhooksController };
function parseProviderType(raw) {
    try {
        return parseCommunicationProviderType(raw);
    }
    catch {
        throw new UnprocessableEntityException('UNKNOWN_PROVIDER');
    }
}
function lowercaseHeaders(headers) {
    const normalized = {};
    for (const [name, value] of Object.entries(headers)) {
        normalized[name.toLowerCase()] = value;
    }
    return normalized;
}
