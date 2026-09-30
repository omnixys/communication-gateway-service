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

import { getLogger } from '@omnixys/logger-ts';

import type { CommunicationProvider } from '../../application/ports/communication-provider.port.js';
import type { ProviderResolver } from '../../application/ports/provider-resolver.port.js';
import { NoProviderAvailableError } from '../../domain/errors.js';
import type { OutboundMessage } from '../../domain/models/outbound-message.model.js';
import type { ResolutionContext } from '../../domain/models/resolution-context.model.js';

const logger = getLogger('DefaultProviderResolver', 'class');

/**
 * Health-aware provider selection: the first healthy primary wins, otherwise
 * the first healthy fallback is used.
 */
export class DefaultProviderResolver implements ProviderResolver {
  constructor(
    private readonly providers: readonly CommunicationProvider[],
    private readonly fallbackProviders: readonly CommunicationProvider[] = [],
  ) {}

  async resolve(
    message: OutboundMessage,
    _context?: ResolutionContext,
  ): Promise<CommunicationProvider> {
    for (const provider of this.providers) {
      if (await this.isHealthy(provider, 'provider unavailable')) {
        return provider;
      }
    }

    for (const provider of this.fallbackProviders) {
      if (await this.isHealthy(provider, 'fallback provider unavailable')) {
        logger.info(
          { provider: provider.providerType, channel: message.channel.type },
          'using fallback provider',
        );
        return provider;
      }
    }

    logger.warn(
      { channel: message.channel.type },
      'no healthy provider available',
    );
    throw new NoProviderAvailableError(message.channel.type);
  }

  private async isHealthy(
    provider: CommunicationProvider,
    reason: string,
  ): Promise<boolean> {
    try {
      const healthy = await provider.health();
      if (!healthy) {
        logger.warn({ provider: provider.providerType }, reason);
      }
      return healthy;
    } catch (error) {
      logger.warn(
        {
          provider: provider.providerType,
          error: error instanceof Error ? error.message : String(error),
        },
        'provider health check failed',
      );
      return false;
    }
  }
}
