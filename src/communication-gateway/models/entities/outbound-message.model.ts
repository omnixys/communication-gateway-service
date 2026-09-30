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

import type { AttachmentReference } from './attachment-reference.model.js';
import type { CommunicationChannel } from './communication-channel.model.js';

/** Message the gateway is asked to deliver to an external provider. */
export interface OutboundMessage {
  readonly id: string;
  readonly channel: CommunicationChannel;
  readonly to: string;
  readonly body: string;
  readonly contentType: string;
  readonly attachment: AttachmentReference | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}
