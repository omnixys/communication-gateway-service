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

import type { DeliveryStatus } from '../enums.js';
import type { ProviderIdentity } from './provider-identity.model.js';

/** Normalized result of a provider delivery attempt. */
export interface ProviderResponse {
  readonly success: boolean;
  readonly providerMessageId: string | null;
  readonly status: DeliveryStatus;
  readonly error: string | null;
  readonly raw: Record<string, unknown> | null;
  readonly providerIdentity: ProviderIdentity | null;
}
