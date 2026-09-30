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

import { CommunicationChannelType } from '../../communication-gateway/domain/enums.js';
import type { ChannelEntry } from '../../communication-gateway/ports/channel-provider-registry.port.js';
import type { CommunicationProvider } from '../../communication-gateway/ports/communication-provider.port.js';
import type {
  AppConfig,
  EmailProviderName,
} from '../../config/config.types.js';
import { InMemoryChannelProviderRegistry } from '../registry/in-memory-channel-provider.registry.js';
import { DefaultProviderResolver } from '../resolvers/default-provider.resolver.js';
import { EvolutionProvider } from './evolution/evolution.provider.js';
import { ResendProvider } from './resend/resend.provider.js';
import { StalwartProvider } from './stalwart/stalwart.provider.js';

const logger = getLogger('ProviderRegistryFactory', 'util');

/**
 * Builds the channel registry from configuration.
 *
 * Only the providers the deployment actually configures are registered, which
 * keeps `/api/v1/providers` and GraphQL consistent with what can be delivered.
 */
export function buildChannelRegistry(
  config: AppConfig,
): InMemoryChannelProviderRegistry {
  const registry = new InMemoryChannelProviderRegistry();
  const registered: string[] = [];

  registerChannel(
    registry,
    CommunicationChannelType.WHATSAPP,
    [new EvolutionProvider(config.evolution)],
    [],
  );
  registered.push('WHATSAPP=EVOLUTION');

  const primary = createEmailProvider(config.emailPrimary, config);
  const fallback = createEmailProvider(config.emailFallback, config);

  if (primary !== null) {
    const fallbacks =
      fallback === null || primary.providerType === fallback.providerType
        ? []
        : [fallback];
    registerChannel(
      registry,
      CommunicationChannelType.EMAIL,
      [primary],
      fallbacks,
    );
    registered.push(
      `EMAIL=${primary.providerType}${fallbacks.length > 0 ? `+${String(fallbacks[0]?.providerType)}` : ''}`,
    );
  } else {
    logger.warn(
      { emailPrimary: config.emailPrimary },
      'no email provider configured, EMAIL channel not registered',
    );
  }

  logger.info({ registered }, 'channel providers registered');
  return registry;
}

/** Closes every provider that holds an open connection. */
export async function closeProviders(
  registry: InMemoryChannelProviderRegistry,
): Promise<void> {
  await Promise.all(
    registry.listProviders().map(async (provider) => {
      if (provider.close === undefined) {
        return;
      }
      try {
        await provider.close();
      } catch (error) {
        logger.warn(
          {
            provider: provider.providerType,
            error: error instanceof Error ? error.message : String(error),
          },
          'provider close failed',
        );
      }
    }),
  );
}

function registerChannel(
  registry: InMemoryChannelProviderRegistry,
  channel: CommunicationChannelType,
  providers: readonly CommunicationProvider[],
  fallbacks: readonly CommunicationProvider[],
): void {
  const entry: ChannelEntry = {
    resolver: new DefaultProviderResolver(providers, fallbacks),
    providers: [...providers, ...fallbacks],
  };
  registry.registerChannel({ type: channel }, entry);
}

function createEmailProvider(
  name: EmailProviderName,
  config: AppConfig,
): CommunicationProvider | null {
  switch (name) {
    case 'resend':
      return new ResendProvider(config.resend);
    case 'stalwart':
      return config.stalwart.enabled
        ? new StalwartProvider(config.stalwart)
        : null;
    case 'none':
      return null;
  }
}
