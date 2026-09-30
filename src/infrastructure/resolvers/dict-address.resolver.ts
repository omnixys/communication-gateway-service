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

import type { AddressResolver } from '../../application/ports/address-resolver.port.js';
import type { AddressMapping } from '../../config/config.types.js';
import type { CommunicationChannelType } from '../../domain/enums.js';
import { AddressResolutionError } from '../../domain/errors.js';

const logger = getLogger('DictAddressResolver', 'class');

/**
 * Resolves recipient addresses from the deployment supplied
 * `ADDRESS_MAPPINGS` document. Compatibility path for clients that still send
 * `recipientId` instead of `recipientAddress`.
 */
export class DictAddressResolver implements AddressResolver {
  private readonly forward = new Map<string, Map<string, string>>();
  private readonly reverse = new Map<string, string>();

  constructor(mapping: AddressMapping = {}) {
    for (const [userId, channels] of Object.entries(mapping)) {
      const perChannel = new Map<string, string>();
      for (const [channel, address] of Object.entries(channels)) {
        perChannel.set(channel.toUpperCase(), address);
        this.reverse.set(address, userId);
      }
      this.forward.set(userId, perChannel);
    }
  }

  async resolve(
    userId: string,
    channel: CommunicationChannelType,
  ): Promise<string> {
    const perChannel = this.forward.get(userId);
    if (perChannel === undefined) {
      logger.warn(
        { userId, channel },
        'address resolution failed: no user mapping',
      );
      throw new AddressResolutionError(
        userId,
        channel,
        `No address mapping for user '${userId}'`,
      );
    }
    const address = perChannel.get(channel);
    if (address === undefined) {
      logger.warn(
        { userId, channel },
        'address resolution failed: no channel address',
      );
      throw new AddressResolutionError(
        userId,
        channel,
        `No ${channel} address for user '${userId}'`,
      );
    }
    return address;
  }

  async reverseLookup(address: string): Promise<string | null> {
    return this.reverse.get(address) ?? null;
  }
}
