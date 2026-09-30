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
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from '@nestjs/common';

/** First HTTP status that indicates a server side failure. */
const SERVER_ERROR = 500;
import { getLogger } from '@omnixys/logger-ts';

import { currentCorrelationId } from '../../shared/request-context.js';
import { sendReply } from '../shared/compat-reply.js';
import type { CompatReply } from '../shared/compat-reply.js';

const logger = getLogger('GatewayExceptionFilter', 'class');

/** Body returned for every failed request. */
export interface ErrorBody {
  readonly statusCode: number;
  readonly message: string;
  readonly error: string;
  readonly correlationId: string;
}

/**
 * Normalizes every error into the Nest error envelope.
 *
 * The previous FastAPI runtime answered `{"detail": {"code", "message"}}`, and
 * several domain failures surfaced as an HTTP 500. Callers now receive a
 * stable `{statusCode, message, error}` body with a machine readable
 * `message` and a correlation id. This is the deliberate external contract
 * change of the 3.0.0 major version.
 */
@Catch()
export class GatewayExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const reply = http.getResponse<CompatReply>();
    const request = http.getRequest<{ method?: string; url?: string }>();
    const correlationId = currentCorrelationId() ?? 'unknown';
    const { status, message, error } = describe(exception);

    const body: ErrorBody = {
      statusCode: status,
      message,
      error,
      correlationId,
    };

    if (status >= SERVER_ERROR) {
      logger.error(
        {
          correlationId,
          method: request?.method,
          url: request?.url,
          error: message,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
        'request_failed',
      );
    } else {
      logger.warn(
        {
          correlationId,
          method: request?.method,
          url: request?.url,
          status,
          error: message,
        },
        'request_rejected',
      );
    }

    sendReply(reply, status, body);
  }
}

function describe(exception: unknown): {
  status: number;
  message: string;
  error: string;
} {
  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    const payload = exception.getResponse();
    if (typeof payload === 'string') {
      return { status, message: payload, error: reason(status) };
    }
    const record = payload as { message?: unknown; error?: unknown };
    const message = Array.isArray(record.message)
      ? record.message.join('; ')
      : typeof record.message === 'string'
        ? record.message
        : exception.message;
    return {
      status,
      message,
      error: typeof record.error === 'string' ? record.error : reason(status),
    };
  }
  if (exception instanceof Error) {
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: exception.name,
    };
  }
  return {
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    message: 'Internal server error',
    error: 'InternalServerError',
  };
}

function reason(status: number): string {
  const text = HttpStatus[status];
  return text === undefined
    ? 'Error'
    : text.replace(/([a-z])([A-Z])/gu, '$1 $2');
}
