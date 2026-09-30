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

import type { ChannelCapabilities } from '../entities/channel-capabilities.model.js';
import type { InboundMessage } from '../entities/inbound-message.model.js';
import type { OutboundMessage } from '../entities/outbound-message.model.js';
import type { ProviderMetadata } from '../entities/provider-metadata.model.js';
import type { CommunicationProviderType } from '../enums/gateway.enums.js';
import type { DeliveryReceipt } from '../payloads/delivery-receipt.model.js';
import type { ProviderResponse } from '../payloads/provider-response.model.js';

/** Result a provider produces when it handles an inbound webhook payload. */
export type WebhookResult =
  | { readonly kind: 'inboundMessage'; readonly message: InboundMessage }
  | { readonly kind: 'deliveryReceipt'; readonly receipt: DeliveryReceipt }
  | { readonly kind: 'ignored' };

/** Adapter contract every external channel provider implements. */
export interface CommunicationProvider {
  readonly providerType: CommunicationProviderType;
  readonly metadata: ProviderMetadata;
  send(message: OutboundMessage): Promise<ProviderResponse>;
  health(): Promise<boolean>;
  capabilities(): Promise<ChannelCapabilities>;
  verifyWebhook(
    headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<boolean>;
  handleWebhook(
    headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<WebhookResult>;
  close?(): Promise<void>;
}
