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

import { Inject, Injectable, type OnApplicationShutdown } from '@nestjs/common';

import { CHANNEL_PROVIDER_REGISTRY } from '../../communication-gateway/shared/tokens.js';
import type { InMemoryChannelProviderRegistry } from '../registry/in-memory-channel-provider.registry.js';
import { closeProviders } from './provider-registry.factory.js';

/**
 * Releases provider resources on shutdown.
 *
 * The Stalwart provider keeps an SMTP socket open between messages, so an
 * orderly shutdown has to close it before the process exits.
 */
@Injectable()
export class ProviderLifecycle implements OnApplicationShutdown {
  constructor(
    @Inject(CHANNEL_PROVIDER_REGISTRY)
    private readonly registry: InMemoryChannelProviderRegistry,
  ) {}

  async onApplicationShutdown(): Promise<void> {
    await closeProviders(this.registry);
  }
}
