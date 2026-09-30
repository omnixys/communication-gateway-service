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

import { PrismaMessageMappingStore } from './prisma-message-mapping.store.js';
import { PrismaService } from './prisma.service.js';
import { MESSAGE_MAPPING_STORE } from './tokens.js';
import { Global, Module } from '@nestjs/common';

/** Persistent database wiring; the in-memory store is reserved for tests. */
@Global()
@Module({
  providers: [
    PrismaService,
    PrismaMessageMappingStore,
    { provide: MESSAGE_MAPPING_STORE, useExisting: PrismaMessageMappingStore },
  ],
  exports: [PrismaService, MESSAGE_MAPPING_STORE],
})
export class PersistenceModule {}
export { MESSAGE_MAPPING_STORE } from './tokens.js';
