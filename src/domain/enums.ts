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

/** Communication channels the gateway can deliver to. */
export enum CommunicationChannelType {
  WHATSAPP = 'WHATSAPP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

/** Provider adapters shipped with this service. */
export enum CommunicationProviderType {
  EVOLUTION = 'EVOLUTION',
  RESEND = 'RESEND',
  STALWART = 'STALWART',
}

/** Delivery lifecycle states tracked per message mapping. */
export enum DeliveryStatus {
  UNKNOWN = 'UNKNOWN',
  PENDING = 'PENDING',
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/** Attachment kinds an inbound message can carry. */
export enum AttachmentType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  AUDIO = 'AUDIO',
  DOCUMENT = 'DOCUMENT',
  FILE = 'FILE',
}

/** Connection state of a provider adapter. */
export enum ProviderStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  CONFIGURING = 'CONFIGURING',
}

/** Content encodings accepted for an outbound message body. */
export enum ContentType {
  TEXT = 'TEXT',
  HTML = 'HTML',
}

/**
 * Narrows an arbitrary string to a {@link CommunicationChannelType}.
 *
 * @throws {RangeError} when the value is not a known channel.
 */
export function parseCommunicationChannelType(
  value: string,
): CommunicationChannelType {
  const normalized = value.trim().toUpperCase();
  const channel = Object.values(CommunicationChannelType).find(
    (candidate) => candidate === normalized,
  );
  if (channel === undefined) {
    throw new RangeError(`Unsupported communication channel: ${value}`);
  }
  return channel;
}

/**
 * Narrows an arbitrary string to a {@link CommunicationProviderType}.
 *
 * @throws {RangeError} when the value is not a registered provider.
 */
export function parseCommunicationProviderType(
  value: string,
): CommunicationProviderType {
  const normalized = value.trim().toUpperCase();
  const provider = Object.values(CommunicationProviderType).find(
    (candidate) => candidate === normalized,
  );
  if (provider === undefined) {
    throw new RangeError(`Unknown provider type: ${value}`);
  }
  return provider;
}

/**
 * Narrows an arbitrary string to a {@link DeliveryStatus}.
 *
 * @throws {RangeError} when the value is not a known delivery state.
 */
export function parseDeliveryStatus(value: string): DeliveryStatus {
  const normalized = value.trim().toUpperCase();
  const status = Object.values(DeliveryStatus).find(
    (candidate) => candidate === normalized,
  );
  if (status === undefined) {
    throw new RangeError(`Unknown delivery status: ${value}`);
  }
  return status;
}
