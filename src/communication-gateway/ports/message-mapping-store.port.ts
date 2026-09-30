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

import type {
  CommunicationProviderType,
  DeliveryStatus,
} from '../domain/enums.js';
import type { MessageMapping } from '../domain/models/message-mapping.model.js';

/** Failure record written to the delivery log. */
export interface DeliveryFailureRecord {
  readonly internalId: string;
  readonly provider: CommunicationProviderType;
  readonly channel: string;
  readonly organizationId: string;
  readonly errorCode: string;
}

/** Persistence port for the provider message id correlation table. */
export interface MessageMappingStore {
  save(mapping: MessageMapping): Promise<void>;
  getByProviderMessageId(
    providerMessageId: string,
  ): Promise<MessageMapping | null>;
  getByInternalId(internalId: string): Promise<MessageMapping | null>;
  findByProviderAndProviderMessageId(
    provider: CommunicationProviderType,
    providerMessageId: string,
  ): Promise<MessageMapping | null>;
  updateStatus(
    providerMessageId: string,
    status: DeliveryStatus,
    error?: string | null,
  ): Promise<void>;
  incrementRetry(internalId: string): Promise<void>;
  recordFailure(record: DeliveryFailureRecord): Promise<void>;
  health(): Promise<boolean>;
}
