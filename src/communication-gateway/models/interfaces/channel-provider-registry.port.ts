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

import type { ChannelCapabilities } from '../entities/channel-capabilities.model.js';
import type { CommunicationChannel } from '../entities/communication-channel.model.js';
import type { ProviderMetadata } from '../entities/provider-metadata.model.js';
import type { CommunicationProviderType } from '../enums/gateway.enums.js';
import type { CommunicationProvider } from './communication-provider.port.js';
import type { ProviderResolver } from './provider-resolver.port.js';

/** Provider selection strategy bound to one channel. */
export interface ChannelEntry {
  readonly resolver: ProviderResolver;
  readonly providers: readonly CommunicationProvider[];
}

/** Registry of the channels this gateway can deliver to. */
export interface ChannelProviderRegistry {
  registerChannel(channel: CommunicationChannel, entry: ChannelEntry): void;
  getByChannel(channel: CommunicationChannel): ChannelEntry;
  getByProviderType(
    providerType: CommunicationProviderType,
  ): CommunicationProvider | null;
  listChannels(): CommunicationChannel[];
  listProviders(): CommunicationProvider[];
  enableProvider(providerType: CommunicationProviderType): void;
  disableProvider(providerType: CommunicationProviderType): void;
  isProviderEnabled(providerType: CommunicationProviderType): boolean;
  getProvidersByChannel(channel: CommunicationChannel): CommunicationProvider[];
  getChannelCapabilities(
    channel: CommunicationChannel,
  ): Promise<ChannelCapabilities>;
  getProviderMetadata(
    providerType: CommunicationProviderType,
  ): ProviderMetadata | null;
}
