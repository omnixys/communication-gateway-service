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

const logger = getLogger('HttpClient', 'util');

/** Options for a single JSON request. */
export interface JsonRequestOptions {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly url: string;
  readonly timeoutMs: number;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: unknown;
}

/** Normalized response of a JSON request. */
export interface JsonResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly data: Record<string, unknown> | null;
  readonly text: string;
}

/** Distinguishes a transport failure from an HTTP error response. */
export class HttpTransportError extends Error {
  constructor(
    message: string,
    public readonly kind: 'timeout' | 'network',
  ) {
    super(message);
    this.name = 'HttpTransportError';
  }
}

/**
 * Performs a JSON request with the runtime `fetch`.
 *
 * The gateway deliberately uses the platform client instead of an HTTP
 * framework: every call site needs precise control over timeouts and over the
 * difference between a rejected request and a failed request.
 *
 * @throws {HttpTransportError} on timeout or connection failure.
 */
export async function requestJson(
  options: JsonRequestOptions,
): Promise<JsonResponse> {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, options.timeoutMs);

  try {
    const response = await fetch(options.url, {
      method: options.method,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      },
      ...(options.body === undefined
        ? {}
        : { body: JSON.stringify(options.body) }),
      signal: controller.signal,
    });

    const text = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      data: parseJsonObject(text),
      text,
    };
  } catch (error) {
    if (error instanceof HttpTransportError) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    const aborted =
      error instanceof Error &&
      (error.name === 'AbortError' || error.name === 'TimeoutError');
    if (aborted) {
      throw new HttpTransportError(
        `Request to ${options.url} timed out after ${String(options.timeoutMs)}ms`,
        'timeout',
      );
    }
    throw new HttpTransportError(
      `Request to ${options.url} failed: ${message}`,
      'network',
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Checks a URL with a GET request and reports whether it answered 2xx. */
export async function probeHttp(
  name: string,
  url: string,
  timeoutMs: number,
  headers: Readonly<Record<string, string>> = {},
): Promise<{ up: boolean; message: string }> {
  try {
    const response = await requestJson({
      method: 'GET',
      url,
      timeoutMs,
      headers,
    });
    return response.ok
      ? { up: true, message: 'ok' }
      : { up: false, message: `HTTP ${String(response.status)}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn({ check: name, url, error: message }, 'health check failed');
    return { up: false, message };
  }
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  if (text.length === 0) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
