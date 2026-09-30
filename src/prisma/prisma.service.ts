/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/config.types.js';
import { Prisma, PrismaClient } from './generated/client.js';
import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { PrismaPg } from '@prisma/adapter-pg';

const logger = getLogger('PrismaService', 'class');

/** One Prisma 7 client is shared by persistence, health and analytics. */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    super({
      adapter: new PrismaPg({ connectionString: config.database.url }),
      log: config.database.echo ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    await this.$queryRaw(Prisma.sql`SELECT 1`);
    logger.info('database_connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  async ping(): Promise<boolean> {
    try {
      await this.$queryRaw(Prisma.sql`SELECT 1`);
      return true;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'database_ping_failed',
      );
      return false;
    }
  }
}
