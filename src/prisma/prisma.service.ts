import { readEnv } from '../config/env.js';
import { PrismaClient } from './generated/client.js';
import { Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { setupPrismaSpans } from '@omnixys/observability-ts';
import { PrismaPg } from '@prisma/adapter-pg';

const logger = getLogger('PrismaService', 'class');

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const url = readEnv(process.env).DATABASE_URL;
    super({ adapter: new PrismaPg({ connectionString: url }) });
  }

  async onModuleInit(): Promise<void> {
    setupPrismaSpans(this);
    await this.$connect();
    let timeout: NodeJS.Timeout | undefined;
    try {
      await Promise.race([
        this.$queryRaw`SELECT 1`,
        new Promise<never>((_resolve, reject) => {
          timeout = setTimeout(
            () => reject(new Error('Database connection check timed out')),
            5_000,
          );
        }),
      ]);
    } finally {
      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
    logger.info('database_connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
