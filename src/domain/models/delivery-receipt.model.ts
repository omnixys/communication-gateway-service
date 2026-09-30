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
} from '../enums';

/** Delivery status report emitted by a provider. */
export interface DeliveryReceipt {
  readonly messageId: string;
  readonly providerMessageId: string;
  readonly providerType: CommunicationProviderType;
  readonly status: DeliveryStatus;
  readonly timestamp: Date;
  readonly error: string | null;
}
