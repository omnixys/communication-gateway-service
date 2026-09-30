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

import { randomUUID } from 'node:crypto';

import { Injectable, type NestMiddleware } from '@nestjs/common';

import { setReplyHeader } from '../../communication-gateway/shared/compat-reply.js';
import type { CompatReply } from '../../communication-gateway/shared/compat-reply.js';
import { runWithRequestContext } from '../request-context.js';

/** Incoming request as seen by the Nest middleware bridge. */
interface MiddlewareRequest {
  readonly method?: string;
  readonly url?: string;
  readonly originalUrl?: string;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Binds the correlation and tenant identity of a request to the async context.
 *
 * Downstream calls - the event forwarder, the Kafka publisher and the Prisma
 * outbox - read the correlation id from this context instead of threading a
 * parameter through every layer.
 */
@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(request: MiddlewareRequest, reply: CompatReply, next: () => void): void {
    const correlationId =
      firstHeader(request.headers['x-correlation-id']) ??
      firstHeader(request.headers['x-request-id']) ??
      randomUUID();
    const organizationId =
      firstHeader(request.headers['x-tenant-id']) ??
      firstHeader(request.headers['x-organization-id']) ??
      '';

    setReplyHeader(reply, 'x-correlation-id', correlationId);

    runWithRequestContext(
      { correlationId, tenantId: organizationId, organizationId },
      () => {
        next();
      },
    );
  }
}

/** Whether a header carries a usable tenant identifier. */
export function isUuid(value: string): boolean {
  return UUID.test(value);
}

function firstHeader(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}
