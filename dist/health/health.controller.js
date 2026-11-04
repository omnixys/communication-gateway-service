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
import { EVENT_FORWARDER } from '../adapter/events/events.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../security/public.decorator.js';
import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
let HealthController = class HealthController {
    prisma;
    forwarder;
    constructor(prisma, forwarder) {
        this.prisma = prisma;
        this.forwarder = forwarder;
    }
    live() {
        return { status: 'ok' };
    }
    liveAlias() {
        return this.live();
    }
    liveness() {
        return this.live();
    }
    readiness(reply) {
        return this.ready(reply);
    }
    async ready(reply) {
        let database = false;
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            database = true;
        }
        catch {
            database = false;
        }
        const checks = {
            database,
            internalApiKey: (process.env.INTERNAL_API_KEY?.trim().length ?? 0) > 0,
            eventForwarder: this.forwarder.isReady,
        };
        const body = { status: Object.values(checks).every(Boolean) ? 'ready' : 'not_ready', checks };
        if (body.status !== 'ready') {
            reply.status(HttpStatus.SERVICE_UNAVAILABLE);
        }
        return body;
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "live", null);
__decorate([
    Get('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "liveAlias", null);
__decorate([
    Get('liveness'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Object)
], HealthController.prototype, "liveness", null);
__decorate([
    Get('readiness'),
    __param(0, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "readiness", null);
__decorate([
    Get('ready'),
    __param(0, Res({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], HealthController.prototype, "ready", null);
HealthController = __decorate([
    Controller('health'),
    Public(),
    __param(1, Inject(EVENT_FORWARDER)),
    __metadata("design:paramtypes", [PrismaService, Function])
], HealthController);
export { HealthController };
