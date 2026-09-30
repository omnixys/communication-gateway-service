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

import type { OutboundMessage } from '../domain/models/outbound-message.model.js';
import type { ProviderResponse } from '../domain/models/provider-response.model.js';
import type { ResolutionContext } from '../domain/models/resolution-context.model.js';
import type { ChannelProviderRegistry } from '../ports/channel-provider-registry.port.js';

const logger = getLogger('GatewayDispatcher', 'class');

/**
 * Resolves the channel entry, asks the resolver for an adapter and performs
 * the delivery. The dispatcher never swallows a failure: the caller decides
 * how a rejected delivery is reported.
 */
export class GatewayDispatcher {
  constructor(private readonly registry: ChannelProviderRegistry) {}

  async dispatch(message: OutboundMessage, context?: ResolutionContext): Promise<ProviderResponse> {
    logger.info(
      {
        messageId: message.id,
        channel: message.channel.type,
        to: message.to,
      },
      'dispatch started',
    );

    try {
      const entry = this.registry.getByChannel(message.channel);
      const provider = await entry.resolver.resolve(message, context);
      const result = await provider.send(message);
      logger.info(
        {
          messageId: message.id,
          provider: provider.providerType,
          providerMessageId: result.providerMessageId,
          success: result.success,
        },
        'dispatch completed',
      );
      return result;
    } catch (error) {
      logger.error(
        {
          messageId: message.id,
          channel: message.channel.type,
          error: error instanceof Error ? error.message : String(error),
        },
        'dispatch failed',
      );
      throw error;
    }
  }
}
