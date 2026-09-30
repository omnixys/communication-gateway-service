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

import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import { Prisma, PrismaClient } from '@prisma/client';

import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/config.types.js';

const logger = getLogger('PrismaService', 'class');

/** Thrown when a query is issued while persistence is disabled. */
export class PersistenceDisabledError extends Error {
  constructor() {
    super('Database access is disabled because DATABASE_URL is empty');
    this.name = 'PersistenceDisabledError';
  }
}

/**
 * Owns the Prisma client lifecycle.
 *
 * The gateway runs without a database in local development. The client is
 * therefore only created when a connection string is configured, and every
 * accessor fails loudly instead of pretending to persist.
 */
@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly prisma: PrismaClient | null;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.prisma = config.database.enabled
      ? new PrismaClient({
          datasources: { db: { url: config.database.url } },
          log: config.database.echo ? ['query', 'info', 'warn', 'error'] : ['warn', 'error'],
        })
      : null;
  }

  /** Whether persistence is available at all. */
  get isEnabled(): boolean {
    return this.prisma !== null;
  }

  /**
   * The Prisma client.
   *
   * @throws {PersistenceDisabledError} when no database is configured.
   */
  get client(): PrismaClient {
    if (this.prisma === null) {
      throw new PersistenceDisabledError();
    }
    return this.prisma;
  }

  /**
   * Warms the connection pool without making an unreachable database fatal.
   *
   * The previous runtime started with a down database and reported the
   * failure through `/health/ready`. Keeping that behaviour avoids a restart
   * loop that turns a transient database outage into a crash loop; the
   * readiness probe is the signal that the gateway is not serving.
   */
  async onModuleInit(): Promise<void> {
    if (this.prisma === null) {
      logger.warn('database_disabled: DATABASE_URL is empty, message mappings are kept in memory');
      return;
    }
    try {
      await this.prisma.$connect();
      logger.info('database_connected');
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'database_unavailable_at_startup: readiness will report database=false',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.prisma?.$disconnect();
  }

  /** Verifies the connection with the cheapest possible query. */
  async ping(): Promise<boolean> {
    if (this.prisma === null) {
      return false;
    }
    try {
      await this.prisma.$queryRaw(Prisma.sql`SELECT 1`);
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
