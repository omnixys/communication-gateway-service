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

import { Inject, Injectable } from '@nestjs/common';
import { Args, Field, Int, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { getLogger } from '@omnixys/logger-ts';

import { CHANNEL_CAPABILITY_KEYS } from '../models/entities/channel-capabilities.model.js';
import { parseCommunicationProviderType } from '../models/enums/gateway.enums.js';
import type { CommunicationProviderType } from '../models/enums/gateway.enums.js';
import type { ChannelProviderRegistry } from '../models/interfaces/channel-provider-registry.port.js';
import type { CommunicationProvider } from '../models/interfaces/communication-provider.port.js';
import { CHANNEL_PROVIDER_REGISTRY } from '../utils/tokens.js';

const logger = getLogger('ProvidersResolver', 'class');

/** Connectivity and feature set of one provider adapter. */
@ObjectType({ description: 'Health and capabilities of a channel provider' })
export class ProviderStatus {
  @Field(() => String, { description: 'Registered provider type' })
  provider_type!: string;

  @Field(() => Boolean, {
    description: 'Whether the provider answered a health probe',
  })
  connected!: boolean;

  @Field(() => Boolean, { description: 'Alias of connected, kept for parity' })
  health!: boolean;

  @Field(() => String, { nullable: true })
  last_error?: string | null;

  @Field(() => [String], {
    nullable: true,
    description: 'Enabled capability names without the supports_ prefix',
  })
  capabilities?: string[] | null;
}

/** Aggregated health of every registered provider. */
@ObjectType({ description: 'Aggregated health of the gateway' })
export class GatewayHealth {
  @Field(() => String)
  status!: string;

  @Field(() => Int)
  provider_count!: number;

  @Field(() => Int)
  healthy_providers!: number;
}

/**
 * Query surface of the federation subgraph.
 *
 * The field names and the snake_case capability values are part of the
 * external contract consumed by the gateway BFF.
 */
@Resolver(() => ProviderStatus)
@Injectable()
export class ProvidersResolver {
  constructor(
    @Inject(CHANNEL_PROVIDER_REGISTRY)
    private readonly registry: ChannelProviderRegistry,
  ) {}

  @Query(() => [ProviderStatus], { name: 'providers' })
  async providers(): Promise<ProviderStatus[]> {
    return Promise.all(
      this.registry.listProviders().map(async (provider) => toStatus(provider)),
    );
  }

  @Query(() => ProviderStatus, { name: 'provider', nullable: true })
  async provider(
    @Args('provider_type', { type: () => String }) providerType: string,
  ): Promise<ProviderStatus | null> {
    const type = tryParse(providerType);
    if (type === null) {
      return null;
    }
    const provider = this.registry.getByProviderType(type);
    return provider === null ? null : toStatus(provider);
  }

  @Query(() => GatewayHealth, { name: 'gatewayHealth' })
  async gatewayHealth(): Promise<GatewayHealth> {
    const providers = this.registry.listProviders();
    const results = await Promise.all(providers.map(probeHealth));
    const healthy = results.filter(Boolean).length;
    return {
      status: healthy === providers.length ? 'healthy' : 'degraded',
      provider_count: providers.length,
      healthy_providers: healthy,
    };
  }
}

async function toStatus(
  provider: CommunicationProvider,
): Promise<ProviderStatus> {
  const healthy = await probeHealth(provider);
  let capabilities: string[] = [];
  try {
    const capabilitySet = await provider.capabilities();
    capabilities = CHANNEL_CAPABILITY_KEYS.filter(
      (key) => capabilitySet[key],
    ).map((key) => key.replace('supports_', ''));
  } catch (error) {
    logger.warn(
      {
        provider: provider.providerType,
        error: error instanceof Error ? error.message : String(error),
      },
      'provider capabilities unavailable',
    );
  }
  return {
    provider_type: provider.providerType,
    connected: healthy,
    health: healthy,
    last_error: null,
    capabilities,
  };
}

async function probeHealth(provider: CommunicationProvider): Promise<boolean> {
  try {
    return await provider.health();
  } catch (error) {
    if (error instanceof Error && error.name === 'NotImplementedError') {
      return false;
    }
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

function tryParse(value: string): CommunicationProviderType | null {
  try {
    return parseCommunicationProviderType(value);
  } catch {
    return null;
  }
}
