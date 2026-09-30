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

import type { InboundMessage } from '../entities/inbound-message.model.js';
import type {
  CommunicationProviderType,
  ProviderStatus,
} from '../enums/gateway.enums.js';
import type { DeliveryReceipt } from './delivery-receipt.model.js';

/** Emitted when a provider delivers an inbound message to the gateway. */
export interface InboundMessageReceived {
  readonly kind: 'InboundMessageReceived';
  readonly message: InboundMessage;
}

/** Emitted when a provider reports a delivery status change. */
export interface MessageDelivered {
  readonly kind: 'MessageDelivered';
  readonly receipt: DeliveryReceipt;
}

/** Emitted when the connectivity of a provider changed. */
export interface ProviderStatusChanged {
  readonly kind: 'ProviderStatusChanged';
  readonly providerType: CommunicationProviderType;
  readonly status: ProviderStatus;
}

/** Every event the in-process bus can carry. */
export type GatewayEvent =
  InboundMessageReceived | MessageDelivered | ProviderStatusChanged;
