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

import {
  BadRequestException,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Inject,
  MethodNotAllowedException,
  Param,
  Post,
  Req,
  UnprocessableEntityException,
  UnauthorizedException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { getLogger } from '@omnixys/logger-ts';
import type { FastifyRequest } from 'fastify';

import { Public } from '../../security/public.decorator.js';
import { type CommunicationProviderType, parseCommunicationProviderType } from '../domain/enums.js';
import { WebhookVerificationError } from '../domain/errors.js';
import type { WebhookOutcome, WebhookService } from '../services/webhook.service.js';
import { WEBHOOK_SERVICE } from '../shared/tokens.js';

const logger = getLogger('WebhooksController', 'class');

/** Response of a processed provider webhook. */
export interface WebhookAck {
  readonly received: boolean;
  readonly result: string | null;
}

/**
 * Receives provider webhooks.
 *
 * The route is public because the providers authenticate themselves through
 * their own signature or API key; the internal API key does not apply.
 */
@Controller('webhooks')
@Public()
export class WebhooksController {
  constructor(@Inject(WEBHOOK_SERVICE) private readonly webhooks: WebhookService) {}

  /**
   * Processes one webhook delivery.
   *
   * The raw body is required for HMAC verification, so the Fastify raw body
   * plugin feeds the buffer instead of the parsed JSON.
   */
  @Post(':providerType')
  @HttpCode(HttpStatus.OK)
  async receive(
    @Param('providerType') raw: string,
    @Headers() headers: Record<string, string>,
    @Req() request: RawBodyRequest<FastifyRequest>,
  ): Promise<WebhookAck> {
    const providerType = parseProviderType(raw);
    const body = request.rawBody;
    if (body === undefined) {
      logger.error(
        { providerType },
        'raw body unavailable, the application must be created with rawBody enabled',
      );
      throw new BadRequestException('RAW_BODY_UNAVAILABLE');
    }
    logger.info({ providerType, bytes: body.length }, 'webhook_received');

    let outcome: WebhookOutcome;
    try {
      outcome = await this.webhooks.processWebhook(providerType, lowercaseHeaders(headers), body);
    } catch (error) {
      if (error instanceof WebhookVerificationError) {
        logger.warn({ providerType }, 'webhook_verification_failed');
        throw new UnauthorizedException('WEBHOOK_VERIFICATION_FAILED');
      }
      throw error;
    }

    logger.info({ providerType, result: outcome }, 'webhook_processed');
    return { received: true, result: outcome };
  }

  /**
   * Challenge verification is not supported.
   *
   * A `GET` on the webhook path is a provider misconfiguration; answering
   * `405` keeps the endpoint from being treated as an unverified source.
   */
  @Get(':providerType')
  challenge(): never {
    throw new MethodNotAllowedException('CHALLENGE_NOT_SUPPORTED');
  }
}

function parseProviderType(raw: string): CommunicationProviderType {
  try {
    return parseCommunicationProviderType(raw);
  } catch {
    throw new UnprocessableEntityException('UNKNOWN_PROVIDER');
  }
}

/**
 * Normalizes header names to lower case.
 *
 * HTTP header names are case insensitive, but the Evolution verifier looks up
 * `x-hub-signature-256` and `apikey` exactly.
 */
function lowercaseHeaders(
  headers: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  const normalized: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    normalized[name.toLowerCase()] = value;
  }
  return normalized;
}
