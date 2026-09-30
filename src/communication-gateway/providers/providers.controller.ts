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

import { BadRequestException, Controller, Get, Inject, Param } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';

import { type CommunicationProviderType, parseCommunicationProviderType } from '../domain/enums.js';
import type { ChannelProviderRegistry } from '../ports/channel-provider-registry.port.js';
import type { CommunicationProvider } from '../ports/communication-provider.port.js';
import { CHANNEL_PROVIDER_REGISTRY } from '../shared/tokens.js';

const logger = getLogger('ProvidersController', 'class');

/** One entry of `GET /api/v1/providers`. */
export interface ProviderListEntry {
  readonly provider_type: string;
  readonly enabled: boolean;
  readonly name?: string;
  readonly version?: string;
  readonly instance?: string | null;
  readonly api_version?: string | null;
  readonly supports_health?: boolean;
  readonly supports_webhooks?: boolean;
}

/** Response of `GET /api/v1/providers/{providerType}/health`. */
export interface ProviderHealthResponse {
  readonly status: string;
  readonly provider: string;
  readonly error?: string;
}

@Controller('api/v1/providers')
export class ProvidersController {
  constructor(
    @Inject(CHANNEL_PROVIDER_REGISTRY)
    private readonly registry: ChannelProviderRegistry,
  ) {}

  /**
   * Lists every registered provider with its advertised capabilities.
   *
   * The snake_case keys are the documented response shape and must not be
   * renamed to camelCase.
   */
  @Get()
  list(): ProviderListEntry[] {
    return this.registry.listProviders().map((provider) => {
      const base: ProviderListEntry = {
        provider_type: provider.providerType,
        enabled: this.registry.isProviderEnabled(provider.providerType),
      };
      try {
        const metadata = provider.metadata;
        return {
          ...base,
          name: metadata.identity.name,
          version: metadata.identity.version,
          instance: metadata.identity.instance,
          api_version: metadata.identity.apiVersion,
          supports_health: metadata.supportsHealth,
          supports_webhooks: metadata.supportsWebhooks,
        };
      } catch (error) {
        logger.warn(
          {
            provider: provider.providerType,
            error: error instanceof Error ? error.message : String(error),
          },
          'provider metadata unavailable',
        );
        return base;
      }
    });
  }

  /** Runs the health probe of a single provider. */
  @Get(':providerType/health')
  async health(@Param('providerType') raw: string): Promise<ProviderHealthResponse> {
    const providerType = parseProviderType(raw);
    const provider = this.registry.getByProviderType(providerType);
    if (provider === null) {
      return {
        status: 'unknown',
        provider: providerType,
        error: `Provider ${providerType} not found`,
      };
    }
    return probe(provider);
  }
}

function parseProviderType(raw: string): CommunicationProviderType {
  try {
    return parseCommunicationProviderType(raw);
  } catch {
    throw new BadRequestException(`Unknown provider type: ${raw}`);
  }
}

async function probe(provider: CommunicationProvider): Promise<ProviderHealthResponse> {
  try {
    const healthy = await provider.health();
    return {
      status: healthy ? 'ok' : 'unavailable',
      provider: provider.providerType,
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'NotImplementedError') {
      return { status: 'not_implemented', provider: provider.providerType };
    }
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(
      { provider: provider.providerType, error: message },
      'provider health check failed',
    );
    return { status: 'error', provider: provider.providerType, error: message };
  }
}
