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

/**
 * Minimal view of the objects Nest hands to middleware and exception filters.
 *
 * Under the Fastify adapter the two call sites receive different shapes:
 * controller handlers and `@Res()` parameters get the Fastify reply, while
 * middleware and the global exception filter are reached through the
 * `@fastify/middie` bridge and get an Express style response instead. The
 * helpers below accept either so the calling code stays readable.
 */
/** The part of a reply that finishes a response. */
export interface ReplySender {
  send: (body: unknown) => unknown;
}

export interface CompatReply {
  statusCode?: number;
  readonly sent?: boolean;
  header?: (name: string, value: string) => unknown;
  setHeader?: (name: string, value: string) => unknown;
  status?: (code: number) => ReplySender;
  send?: (body: unknown) => unknown;
  end?: (chunk?: string) => unknown;
  raw?: {
    readonly sent?: boolean;
    header?: (name: string, value: string) => unknown;
    status?: (code: number) => ReplySender;
    send?: (body: unknown) => unknown;
  };
}

/** Sets a response header on either reply shape. */
export function setReplyHeader(
  reply: CompatReply,
  name: string,
  value: string,
): void {
  if (typeof reply.header === 'function') {
    reply.header(name, value);
    return;
  }
  if (typeof reply.setHeader === 'function') {
    reply.setHeader(name, value);
    return;
  }
  reply.raw?.header?.(name, value);
}

/**
 * Writes a fully formed error body.
 *
 * The correlation id has to survive an exception, so the filter cannot defer
 * to the framework default response and has to speak both reply dialects.
 */
export function sendReply(
  reply: CompatReply,
  statusCode: number,
  body: unknown,
): void {
  if (isSent(reply)) {
    return;
  }
  if (typeof reply.status === 'function') {
    reply.status(statusCode).send(body);
    return;
  }
  const raw = reply.raw;
  if (raw !== undefined && typeof raw.status === 'function') {
    raw.status(statusCode).send(body);
    return;
  }
  reply.statusCode = statusCode;
  reply.end?.(JSON.stringify(body));
}

/** Whether a response was already committed. */
export function isSent(reply: CompatReply): boolean {
  return reply.sent === true || reply.raw?.sent === true;
}
