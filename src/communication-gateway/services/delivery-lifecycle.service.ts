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

import { InvalidStatusTransitionError } from '../errors/gateway.errors.js';
import { DeliveryStatus } from '../models/enums/gateway.enums.js';

const logger = getLogger('DeliveryLifecycle', 'domain');

const VALID_TRANSITIONS: Readonly<Record<DeliveryStatus, ReadonlySet<DeliveryStatus>>> = {
  [DeliveryStatus.UNKNOWN]: new Set([DeliveryStatus.PENDING, DeliveryStatus.FAILED]),
  [DeliveryStatus.PENDING]: new Set([
    DeliveryStatus.QUEUED,
    DeliveryStatus.SENT,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ]),
  [DeliveryStatus.QUEUED]: new Set([
    DeliveryStatus.SENT,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ]),
  [DeliveryStatus.SENT]: new Set([
    DeliveryStatus.DELIVERED,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ]),
  [DeliveryStatus.DELIVERED]: new Set([
    DeliveryStatus.READ,
    DeliveryStatus.FAILED,
    DeliveryStatus.CANCELLED,
  ]),
  [DeliveryStatus.READ]: new Set([DeliveryStatus.FAILED, DeliveryStatus.CANCELLED]),
  [DeliveryStatus.FAILED]: new Set([DeliveryStatus.PENDING, DeliveryStatus.CANCELLED]),
  [DeliveryStatus.CANCELLED]: new Set<DeliveryStatus>(),
};

/** Reports whether a delivery status change is allowed. */
export function isValidTransition(current: DeliveryStatus, next: DeliveryStatus): boolean {
  if (current === next) {
    return true;
  }
  return VALID_TRANSITIONS[current]?.has(next) ?? false;
}

/**
 * Enforces the delivery lifecycle.
 *
 * @throws {InvalidStatusTransitionError} when the change is not allowed.
 */
export function assertValidTransition(current: DeliveryStatus, next: DeliveryStatus): void {
  if (!isValidTransition(current, next)) {
    logger.warn({ currentStatus: current, attemptedStatus: next }, 'invalid status transition');
    throw new InvalidStatusTransitionError(current, next);
  }
}
