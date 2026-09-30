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

import { Global, Module } from '@nestjs/common';

import type { MessageMappingStore } from '../../application/ports/message-mapping-store.port.js';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/config.types.js';
import { InMemoryMessageMappingStore } from './in-memory-message-mapping.store.js';
import { PrismaMessageMappingStore } from './prisma-message-mapping.store.js';
import { PrismaService } from './prisma.service.js';

export const MESSAGE_MAPPING_STORE = Symbol('MESSAGE_MAPPING_STORE');

/**
 * Persistence wiring.
 *
 * The store implementation is selected once, at startup, from the presence of
 * `DATABASE_URL`. Both implementations satisfy the same port, so the
 * application layer never branches on the environment.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: MESSAGE_MAPPING_STORE,
      inject: [APP_CONFIG, PrismaService],
      useFactory: (config: AppConfig, prisma: PrismaService): MessageMappingStore =>
        config.database.enabled
          ? new PrismaMessageMappingStore(prisma)
          : new InMemoryMessageMappingStore(),
    },
  ],
  exports: [MESSAGE_MAPPING_STORE, PrismaService],
})
export class PersistenceModule {}
