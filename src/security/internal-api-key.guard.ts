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
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { getLogger } from '@omnixys/logger-ts';
import { timingSafeEqual } from 'node:crypto';

import { APP_CONFIG } from '../config/config.module.js';
import type { AppConfig } from '../config/config.types.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

const logger = getLogger('InternalApiKeyGuard', 'class');

/** Header carrying the internal API key, matching the previous runtime. */
export const INTERNAL_API_KEY_HEADER = 'x-internal-api-key';

/**
 * Enforces the internal API key on every non-public route.
 *
 * The guard fails closed: a missing `INTERNAL_API_KEY` answers `503` instead
 * of silently accepting unauthenticated traffic. The previous Python runtime
 * skipped the check when the key was empty, which turned a configuration
 * mistake into an open endpoint.
 */
@Injectable()
export class InternalApiKeyGuard implements CanActivate {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic === true) {
      return true;
    }

    const expected = this.config.core.internalApiKey;
    if (expected.length === 0) {
      logger.error(
        'internal_api_key_missing: refusing request, INTERNAL_API_KEY is not configured',
      );
      throw new ServiceUnavailableException('INTERNAL_API_KEY_NOT_CONFIGURED');
    }

    const provided = readPresentedKey(context);
    if (provided === null) {
      throw new UnauthorizedException('INVALID_INTERNAL_API_KEY');
    }
    if (!constantTimeEquals(provided, expected)) {
      logger.warn(
        { path: describeTarget(context) },
        'invalid_internal_api_key_attempt',
      );
      throw new UnauthorizedException('INVALID_INTERNAL_API_KEY');
    }
    return true;
  }
}

/** Minimal shape of a request as seen by the guard. */
interface GuardedRequest {
  readonly method?: string;
  readonly url?: string;
  readonly originalUrl?: string;
  readonly headers?: Readonly<Record<string, string | string[] | undefined>>;
}

/** GraphQL context as produced by the Fastify adapter. */
interface GraphqlContext {
  readonly request?: GuardedRequest;
  readonly req?: GuardedRequest;
}

/**
 * Reads the key from the transport that is currently being served.
 *
 * A global guard also runs for every GraphQL field resolver, where
 * `switchToHttp()` has no request. The GraphQL endpoint was protected by the
 * same dependency in the previous runtime, so the key is read from the
 * underlying HTTP request instead of being skipped.
 */
function readPresentedKey(context: ExecutionContext): string | null {
  const request = resolveRequest(context);
  const headers = request?.headers;
  if (headers === undefined) {
    return null;
  }
  return readHeader(headers[INTERNAL_API_KEY_HEADER]);
}

function resolveRequest(context: ExecutionContext): GuardedRequest | null {
  if (context.getType<string>() === 'graphql') {
    const gql = GqlExecutionContext.create(context);
    const carrier = gql.getContext<GraphqlContext>();
    return carrier.request ?? carrier.req ?? null;
  }
  return context.switchToHttp().getRequest<GuardedRequest>();
}

function describeTarget(context: ExecutionContext): string {
  const request = resolveRequest(context);
  if (request === undefined || request === null) {
    return context.getClass().name;
  }
  return `${request.method ?? 'UNKNOWN'} ${request.originalUrl ?? request.url ?? ''}`;
}

function readHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function constantTimeEquals(candidate: string, expected: string): boolean {
  const provided = Buffer.from(candidate, 'utf8');
  const configured = Buffer.from(expected, 'utf8');
  if (provided.length !== configured.length) {
    return false;
  }
  return timingSafeEqual(provided, configured);
}
