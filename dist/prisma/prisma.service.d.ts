import { PrismaClient } from './generated/client.js';
import { type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
}
