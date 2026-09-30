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

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verifies the HMAC-SHA256 signature of an Evolution webhook.
 *
 * The signature is computed over the raw request body and travels either as a
 * bare hex digest or with the `sha256=` prefix, which is how Evolution
 * instances differ in their configuration.
 *
 * A missing signature is always a rejection: treating it as a match would let
 * any caller post to the webhook endpoint.
 *
 * @param body raw request body exactly as received.
 * @param secret shared secret configured on the Evolution instance.
 * @param signature value of the signature header, if present.
 */
export function verifyEvolutionSignature(
  body: Buffer,
  secret: string,
  signature: string | null,
): boolean {
  if (signature === null || signature.length === 0 || secret.length === 0) {
    return false;
  }

  const expected = createHmac('sha256', secret).update(body).digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(
      signature.startsWith('sha256=') ? signature.slice(7) : signature,
      'hex',
    );
  } catch {
    return false;
  }

  if (provided.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(provided, expected);
}

/**
 * Checks the constant-time API key comparison of an Evolution webhook.
 *
 * The key may be supplied either through a header or as `apikey` inside the
 * JSON body, which is how Evolution instances send it by default.
 *
 * @param candidate key presented by the caller.
 * @param expected key configured for the service.
 */
export function verifyApiKey(
  candidate: string | null,
  expected: string,
): boolean {
  if (candidate === null || candidate.length === 0) {
    return false;
  }
  return constantTimeEquals(candidate, expected);
}

function constantTimeEquals(candidate: string, expected: string): boolean {
  if (expected.length === 0) {
    return false;
  }
  const provided = Buffer.from(candidate, 'utf8');
  const configured = Buffer.from(expected, 'utf8');
  if (provided.length !== configured.length) {
    return false;
  }
  return timingSafeEqual(provided, configured);
}

/**
 * Checks a bearer token against the webhook secret.
 *
 * Some Evolution deployments are configured with an authorization header
 * instead of a signature, which is the same secret.
 */
export function verifyBearerSecret(
  headers: Readonly<Record<string, string>>,
  secret: string,
): boolean {
  if (secret.length === 0) {
    return false;
  }
  const entry = Object.entries(headers).find(
    ([name]) => name.toLowerCase() === 'authorization',
  );
  const value = entry?.[1];
  if (!value?.startsWith('Bearer ')) {
    return false;
  }
  return constantTimeEquals(value.slice(7), secret);
}
