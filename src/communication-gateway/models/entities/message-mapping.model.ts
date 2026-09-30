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

import { DeliveryStatus } from '../enums/gateway.enums.js';
import type {
  CommunicationChannelType,
  CommunicationProviderType,
} from '../enums/gateway.enums.js';

/** Persisted correlation between an internal message and its provider copy. */
export interface MessageMapping {
  internalId: string;
  providerMessageId: string;
  provider: CommunicationProviderType;
  channel: CommunicationChannelType;
  conversationId: string;
  sender: string;
  recipient: string;
  status: DeliveryStatus;
  tenantId: string;
  organizationId: string;
  providerInstance: string;
  retryCount: number;
  lastStatusChange: Date | null;
  lastError: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date | null;
}

/** Creates a mapping in its initial `PENDING` state. */
export function createMessageMapping(
  seed: Pick<
    MessageMapping,
    | 'internalId'
    | 'providerMessageId'
    | 'provider'
    | 'channel'
    | 'conversationId'
  > &
    Partial<MessageMapping>,
): MessageMapping {
  return {
    sender: '',
    recipient: '',
    status: DeliveryStatus.PENDING,
    tenantId: '',
    organizationId: '',
    providerInstance: '',
    retryCount: 0,
    lastStatusChange: null,
    lastError: null,
    metadata: null,
    createdAt: new Date(),
    updatedAt: null,
    ...seed,
  };
}
