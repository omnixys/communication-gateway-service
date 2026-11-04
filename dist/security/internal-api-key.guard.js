var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, ServiceUnavailableException, UnauthorizedException, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { getLogger } from '@omnixys/logger-ts';
import { timingSafeEqual } from 'node:crypto';
import { IS_PUBLIC_KEY } from './public.decorator.js';
const logger = getLogger('InternalApiKeyGuard', 'class');
export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';
let InternalApiKeyGuard = class InternalApiKeyGuard {
    reflector;
    constructor(reflector) {
        this.reflector = reflector;
    }
    canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic === true) {
            return true;
        }
        const expected = process.env.INTERNAL_API_KEY?.trim() ?? '';
        if (expected.length === 0) {
            logger.error('internal_api_key_missing: refusing request, INTERNAL_API_KEY is not configured');
            throw new ServiceUnavailableException('INTERNAL_API_KEY_NOT_CONFIGURED');
        }
        const provided = readPresentedKey(context);
        if (provided === null) {
            throw new UnauthorizedException('INVALID_INTERNAL_API_KEY');
        }
        if (!constantTimeEquals(provided, expected)) {
            logger.warn({ path: describeTarget(context) }, 'invalid_internal_api_key_attempt');
            throw new UnauthorizedException('INVALID_INTERNAL_API_KEY');
        }
        return true;
    }
};
InternalApiKeyGuard = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [Reflector])
], InternalApiKeyGuard);
export { InternalApiKeyGuard };
function readPresentedKey(context) {
    const request = resolveRequest(context);
    const headers = request?.headers;
    if (headers === undefined) {
        return null;
    }
    return readHeader(headers[INTERNAL_API_KEY_HEADER]);
}
function resolveRequest(context) {
    if (context.getType() === 'graphql') {
        const gql = GqlExecutionContext.create(context);
        const carrier = gql.getContext();
        return carrier.request ?? carrier.req ?? null;
    }
    return context.switchToHttp().getRequest();
}
function describeTarget(context) {
    const request = resolveRequest(context);
    if (request === undefined || request === null) {
        return context.getClass().name;
    }
    return `${request.method ?? 'UNKNOWN'} ${request.originalUrl ?? request.url ?? ''}`;
}
function readHeader(value) {
    if (Array.isArray(value)) {
        return value[0] ?? null;
    }
    return value ?? null;
}
function constantTimeEquals(candidate, expected) {
    const provided = Buffer.from(candidate, 'utf8');
    const configured = Buffer.from(expected, 'utf8');
    if (provided.length !== configured.length) {
        return false;
    }
    return timingSafeEqual(provided, configured);
}
