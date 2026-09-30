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

import { Controller, Get, Inject, Res } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import type { FastifyReply } from 'fastify';

import { EVENT_FORWARDER } from '../adapter/events/events.module.js';
import type { HttpEventForwarder } from '../adapter/events/http-event.forwarder.js';
import { CommunicationProviderType } from '../communication-gateway/domain/enums.js';
import type { ChannelProviderRegistry } from '../communication-gateway/ports/channel-provider-registry.port.js';
import type { MessageMappingStore } from '../communication-gateway/ports/message-mapping-store.port.js';
import { CHANNEL_PROVIDER_REGISTRY } from '../communication-gateway/shared/tokens.js';
import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/config.types.js';
import { MESSAGE_MAPPING_STORE } from '../prisma/persistence.module.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../security/public.decorator.js';

const logger = getLogger('HealthController', 'class');

/** Response of the readiness probe. */
export interface ReadinessResponse {
  readonly status: 'ready' | 'not_ready';
  readonly checks: Readonly<Record<string, boolean>>;
}

@Controller('health')
@Public()
export class HealthController {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    @Inject(CHANNEL_PROVIDER_REGISTRY)
    private readonly registry: ChannelProviderRegistry,
    @Inject(MESSAGE_MAPPING_STORE)
    private readonly mappingStore: MessageMappingStore,
    private readonly prisma: PrismaService,
    @Inject(EVENT_FORWARDER) private readonly forwarder: HttpEventForwarder,
  ) {}

  /** Liveness of the process itself. */
  @Get()
  health(): { status: string; service: string; version: string } {
    return {
      status: 'ok',
      service: this.config.core.serviceName,
      version: '3.0.0',
    };
  }

  /**
   * Liveness probe.
   *
   * A second handler serves `/health/liveness` because stacked route
   * decorators overwrite each other, and the Kubernetes manifests and the
   * Compose healthcheck use different spellings of the same probe.
   */
  @Get('live')
  live(): { status: string } {
    return { status: 'ok' };
  }

  /** Alias of {@link HealthController.live}. */
  @Get('liveness')
  liveness(): { status: string } {
    return { status: 'ok' };
  }

  /**
   * Readiness probe.
   *
   * `stalwart` is optional and therefore excluded from the verdict, matching
   * the previous runtime: the gateway stays ready without an SMTP provider.
   */
  @Get('ready')
  async ready(@Res({ passthrough: true }) reply: FastifyReply): Promise<ReadinessResponse> {
    return this.probe(reply);
  }

  /** Alias of {@link HealthController.ready}. */
  @Get('readiness')
  async readiness(@Res({ passthrough: true }) reply: FastifyReply): Promise<ReadinessResponse> {
    return this.probe(reply);
  }

  private async probe(reply: FastifyReply): Promise<ReadinessResponse> {
    const checks: Record<string, boolean> = {
      evolution: await this.providerHealth(CommunicationProviderType.EVOLUTION),
      resend: await this.providerHealth(CommunicationProviderType.RESEND),
      stalwart: await this.providerHealth(CommunicationProviderType.STALWART),
      chatForwarder:
        this.config.core.chatServiceUrl.length > 0 && this.config.core.chatServiceApiKey.length > 0,
      eventForwarder: this.forwarder.isReady,
      internalApiKey: this.config.core.internalApiKey.length > 0,
      database: await this.databaseAvailable(),
    };

    if (this.config.observability.tempoHealthUrl.length > 0) {
      checks['tempo'] = await checkHttp('tempo', this.config.observability.tempoHealthUrl);
    }
    if (this.config.observability.prometheusHealthUrl.length > 0) {
      checks['prometheus'] = await checkHttp(
        'prometheus',
        this.config.observability.prometheusHealthUrl,
      );
    }

    const ready = Object.entries(checks)
      .filter(([name]) => name !== 'stalwart')
      .every(([, healthy]) => healthy);

    if (!ready) {
      reply.status(503);
      return { status: 'not_ready', checks };
    }
    return { status: 'ready', checks };
  }

  private async providerHealth(providerType: CommunicationProviderType): Promise<boolean> {
    const provider = this.registry.getByProviderType(providerType);
    if (provider === null) {
      return false;
    }
    try {
      return await provider.health();
    } catch (error) {
      logger.warn(
        {
          provider: providerType,
          error: error instanceof Error ? error.message : String(error),
        },
        'readiness provider probe failed',
      );
      return false;
    }
  }

  private async databaseAvailable(): Promise<boolean> {
    if (await this.mappingStore.health()) {
      return true;
    }
    return this.prisma.ping();
  }
}

async function checkHttp(name: string, url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch (error) {
    logger.warn(
      { check: name, error: error instanceof Error ? error.message : String(error) },
      'readiness http check failed',
    );
    return false;
  }
}
