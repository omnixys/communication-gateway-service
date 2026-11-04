var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { readEnv } from '../config/env.js';
import { PrismaClient } from './generated/client.js';
import { Injectable } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { setupPrismaSpans } from '@omnixys/observability-ts';
import { PrismaPg } from '@prisma/adapter-pg';
const logger = getLogger('PrismaService', 'class');
let PrismaService = class PrismaService extends PrismaClient {
    constructor() {
        const url = readEnv(process.env).DATABASE_URL;
        super({ adapter: new PrismaPg({ connectionString: url }) });
    }
    async onModuleInit() {
        setupPrismaSpans(this);
        await this.$connect();
        let timeout;
        try {
            await Promise.race([
                this.$queryRaw `SELECT 1`,
                new Promise((_resolve, reject) => {
                    timeout = setTimeout(() => reject(new Error('Database connection check timed out')), 5_000);
                }),
            ]);
        }
        finally {
            if (timeout !== undefined) {
                clearTimeout(timeout);
            }
        }
        logger.info('database_connected');
    }
    async onModuleDestroy() {
        await this.$disconnect();
    }
};
PrismaService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [])
], PrismaService);
export { PrismaService };
