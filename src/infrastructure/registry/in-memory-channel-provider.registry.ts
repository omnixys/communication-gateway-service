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

import type {
  ChannelEntry,
  ChannelProviderRegistry,
} from '../../application/ports/channel-provider-registry.port.js';
import type { CommunicationProvider } from '../../application/ports/communication-provider.port.js';
import type { CommunicationProviderType } from '../../domain/enums.js';
import { type CommunicationChannelType } from '../../domain/enums.js';
import { ChannelNotFoundError } from '../../domain/errors.js';
import { mergeChannelCapabilities } from '../../domain/models/channel-capabilities.model.js';
import type { ChannelCapabilities } from '../../domain/models/channel-capabilities.model.js';
import type { CommunicationChannel } from '../../domain/models/communication-channel.model.js';
import type { ProviderMetadata } from '../../domain/models/provider-metadata.model.js';

const logger = getLogger('InMemoryChannelProviderRegistry', 'class');

/**
 * Process local registry of channels and provider adapters.
 *
 * A disabled provider stays registered but is hidden from every lookup, so it
 * can be re-enabled without registering the channel again.
 */
export class InMemoryChannelProviderRegistry implements ChannelProviderRegistry {
  private readonly channels = new Map<CommunicationChannelType, ChannelEntry>();
  private readonly providers = new Map<
    CommunicationProviderType,
    CommunicationProvider
  >();
  private readonly disabled = new Set<CommunicationProviderType>();

  registerChannel(channel: CommunicationChannel, entry: ChannelEntry): void {
    if (this.channels.has(channel.type)) {
      throw new Error(`Channel already registered: ${channel.type}`);
    }
    this.channels.set(channel.type, entry);
    for (const provider of entry.providers) {
      this.providers.set(provider.providerType, provider);
    }
  }

  getByChannel(channel: CommunicationChannel): ChannelEntry {
    const entry = this.channels.get(channel.type);
    if (entry === undefined) {
      throw new ChannelNotFoundError(channel.type);
    }
    return entry;
  }

  getByProviderType(
    providerType: CommunicationProviderType,
  ): CommunicationProvider | null {
    if (this.disabled.has(providerType)) {
      return null;
    }
    return this.providers.get(providerType) ?? null;
  }

  listChannels(): CommunicationChannel[] {
    return [...this.channels.keys()].map((type) => ({ type }));
  }

  listProviders(): CommunicationProvider[] {
    return [...this.providers.values()];
  }

  enableProvider(providerType: CommunicationProviderType): void {
    this.disabled.delete(providerType);
  }

  disableProvider(providerType: CommunicationProviderType): void {
    this.disabled.add(providerType);
  }

  isProviderEnabled(providerType: CommunicationProviderType): boolean {
    return !this.disabled.has(providerType);
  }

  getProvidersByChannel(
    channel: CommunicationChannel,
  ): CommunicationProvider[] {
    const entry = this.channels.get(channel.type);
    if (entry === undefined) {
      return [];
    }
    return entry.providers.filter(
      (provider) => !this.disabled.has(provider.providerType),
    );
  }

  async getChannelCapabilities(
    channel: CommunicationChannel,
  ): Promise<ChannelCapabilities> {
    const capabilitySets: ChannelCapabilities[] = [];
    for (const provider of this.getProvidersByChannel(channel)) {
      try {
        capabilitySets.push(await provider.capabilities());
      } catch (error) {
        logger.warn(
          {
            provider: provider.providerType,
            error: error instanceof Error ? error.message : String(error),
          },
          'provider capabilities could not be read',
        );
      }
    }
    return mergeChannelCapabilities(...capabilitySets);
  }

  getProviderMetadata(
    providerType: CommunicationProviderType,
  ): ProviderMetadata | null {
    const provider = this.providers.get(providerType);
    if (provider === undefined) {
      return null;
    }
    try {
      return provider.metadata;
    } catch (error) {
      logger.warn(
        {
          provider: providerType,
          error: error instanceof Error ? error.message : String(error),
        },
        'provider metadata could not be read',
      );
      return null;
    }
  }
}
