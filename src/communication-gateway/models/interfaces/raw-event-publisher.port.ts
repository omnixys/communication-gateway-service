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

import type { MessageMapping } from '../entities/message-mapping.model.js';
import { DeliveryStatus } from '../enums/gateway.enums.js';

/** Cross-service event publisher that writes raw payloads to a broker. */
export interface RawEventPublisher {
  readonly enabled: boolean;
  publishRaw(
    topic: string,
    value: string,
    key?: string,
    headers?: Readonly<Record<string, string>>,
  ): Promise<void>;
  shutdown(): Promise<void>;
}

/** Analytics delivery outcome published through the transactional outbox. */
export const ANALYTICS_DELIVERY_SUCCEEDED_TOPIC =
  'communication.delivery.succeeded.v1';
export const ANALYTICS_DELIVERY_FAILED_TOPIC =
  'communication.delivery.failed.v1';

/** Delivery statuses that produce an analytics fact. */
export const ANALYTICS_TERMINAL_STATUSES: ReadonlySet<DeliveryStatus> =
  new Set<DeliveryStatus>([
    DeliveryStatus.DELIVERED,
    DeliveryStatus.READ,
    DeliveryStatus.FAILED,
  ]);

/** Writes delivery outcome facts for the analytics pipeline. */
export interface AnalyticsOutboxPort {
  enqueueDeliveryFact(
    mapping: Pick<
      MessageMapping,
      | 'internalId'
      | 'channel'
      | 'conversationId'
      | 'provider'
      | 'organizationId'
    >,
    status: DeliveryStatus,
  ): Promise<void>;
}
