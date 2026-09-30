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

import type { AttachmentReference } from '../../../communication-gateway/models/entities/attachment-reference.model.js';
import type { InboundMessage } from '../../../communication-gateway/models/entities/inbound-message.model.js';
import type { ProviderIdentity } from '../../../communication-gateway/models/entities/provider-identity.model.js';
import {
  AttachmentType,
  CommunicationProviderType,
  DeliveryStatus,
} from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { CommunicationChannelType } from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { DeliveryReceipt } from '../../../communication-gateway/models/payloads/delivery-receipt.model.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
import { asNumber, asRecord, asText } from '../../../core/coerce.js';

const WHATSAPP_SUFFIX = '@s.whatsapp.net';

/** Reads a nested object, defaulting to an empty record. */
function record(value: unknown): Record<string, unknown> {
  return asRecord(value) ?? {};
}

/** Reads a nested string, defaulting to an empty string. */
function text(value: unknown, fallback = ''): string {
  return asText(value, fallback);
}

/** Webhook envelope delivered by an Evolution instance. */
export interface EvolutionWebhookPayload {
  readonly event: string;
  readonly instance: string;
  readonly data: unknown;
}

/** Message part of a `messages.upsert` webhook. */
export interface EvolutionMessageData {
  readonly key: Record<string, unknown>;
  readonly pushName: string;
  readonly message: Record<string, unknown> | null;
  readonly messageType: string | null;
}

const MEDIA_KEYS: ReadonlyArray<readonly [string, AttachmentType]> = [
  ['imageMessage', AttachmentType.IMAGE],
  ['videoMessage', AttachmentType.VIDEO],
  ['audioMessage', AttachmentType.AUDIO],
  ['documentMessage', AttachmentType.DOCUMENT],
];

const RECEIPT_STATUS_MAP: Readonly<Record<string, DeliveryStatus>> = {
  read: DeliveryStatus.READ,
  delivered: DeliveryStatus.DELIVERED,
  failed: DeliveryStatus.FAILED,
  sent: DeliveryStatus.SENT,
};

/** Maps an Evolution send response to the normalized provider response. */
export function mapToProviderResponse(
  status: 'success' | 'error',
  data: Record<string, unknown> | null,
  error: string | null,
  identity: ProviderIdentity,
): ProviderResponse {
  if (status === 'success' && data !== null) {
    const key = record(data['key']);
    const providerMessageId = text(key['id']);
    return {
      success: true,
      providerMessageId:
        providerMessageId.length > 0 ? providerMessageId : null,
      status: DeliveryStatus.SENT,
      error: null,
      raw: data,
      providerIdentity: identity,
    };
  }
  return {
    success: false,
    providerMessageId: null,
    status: DeliveryStatus.FAILED,
    error: error ?? 'Unknown error',
    raw: data,
    providerIdentity: identity,
  };
}

/** Maps a `messages.upsert` entry to an inbound message. */
export function mapToInboundMessage(
  messageData: EvolutionMessageData,
  providerInstance: string | null,
  channel: CommunicationChannelType,
): InboundMessage {
  const messageId = text(messageData.key['id']);
  const remoteJid = text(messageData.key['remoteJid']);
  const attachment = extractAttachment(messageData);

  return {
    messageId,
    channel: { type: channel },
    providerType: CommunicationProviderType.EVOLUTION,
    from: remoteJid.replace(WHATSAPP_SUFFIX, ''),
    body: extractBody(messageData),
    providerInstance,
    senderName: messageData.pushName.length > 0 ? messageData.pushName : null,
    contentType: attachment === null ? 'TEXT' : attachment.type,
    attachment,
    conversationId: null,
    receivedAt: new Date(),
  };
}

/** Maps a `messages.update` entry to a delivery receipt. */
export function mapToDeliveryReceipt(
  messageData: EvolutionMessageData,
): DeliveryReceipt {
  const messageId = text(messageData.key['id']);
  const status =
    RECEIPT_STATUS_MAP[messageData.messageType ?? ''] ?? DeliveryStatus.UNKNOWN;

  return {
    messageId,
    providerMessageId: messageId,
    providerType: CommunicationProviderType.EVOLUTION,
    status,
    timestamp: new Date(),
    error: null,
  };
}

/** Normalizes the loosely typed `data` field of a webhook envelope. */
export function toWebhookPayload(raw: unknown): EvolutionWebhookPayload {
  const envelope = record(raw);
  return {
    event: text(envelope['event']),
    instance: text(envelope['instance']),
    data: envelope['data'] ?? {},
  };
}

function extractBody(data: EvolutionMessageData): string {
  const message = data.message;
  if (message === null) {
    return '';
  }
  const extended = record(message['extendedTextMessage']);
  if ('extendedTextMessage' in message) {
    return text(extended['text']);
  }
  if ('conversation' in message) {
    return text(message['conversation']);
  }
  for (const [key] of MEDIA_KEYS) {
    if (key in message) {
      return text(record(message[key])['caption']);
    }
  }
  return '';
}

function extractAttachment(
  data: EvolutionMessageData,
): AttachmentReference | null {
  const message = data.message;
  if (message === null) {
    return null;
  }

  for (const [key, type] of MEDIA_KEYS) {
    if (!(key in message)) {
      continue;
    }
    const media = record(message[key]);
    const rawSize = asNumber(media['fileLength']) ?? 0;
    return {
      attachmentId: text(data.key['id']),
      type,
      url: text(media['url']),
      filename: text(media['fileName'], 'unknown'),
      mimeType: text(media['mimetype'], 'application/octet-stream'),
      sizeBytes: rawSize,
    };
  }

  return null;
}
