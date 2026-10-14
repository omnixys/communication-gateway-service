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

import { getLogger } from '@omnixys/logger-ts';

import {
  EMPTY_CHANNEL_CAPABILITIES,
  type ChannelCapabilities,
} from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import type { OutboundMessage } from '../../../communication-gateway/models/entities/outbound-message.model.js';
import type { ProviderIdentity } from '../../../communication-gateway/models/entities/provider-identity.model.js';
import type { ProviderMetadata } from '../../../communication-gateway/models/entities/provider-metadata.model.js';
import {
  CommunicationChannelType,
  CommunicationProviderType,
} from '../../../communication-gateway/models/enums/gateway.enums.js';
import type { WebhookResult } from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { CommunicationProvider } from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { EvolutionConfig } from '../../../communication-gateway/models/interfaces/evolution-config.interface.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
import {
  HttpTransportError,
  probeHttp,
  requestJson,
} from '../../http/json-request.js';
import {
  type EvolutionMessageData,
  type EvolutionWebhookPayload,
  mapToDeliveryReceipt,
  mapToInboundMessage,
  mapToProviderResponse,
  toWebhookPayload,
} from './evolution.mapper.js';
import {
  verifyApiKey,
  verifyBearerSecret,
  verifyEvolutionSignature,
} from './evolution.webhook-verifier.js';

const logger = getLogger('EvolutionProvider', 'class');

const API_VERSION = 'v1';
const DEFAULT_TIMEOUT_MS = 30_000;

/** Adapter for an Evolution API instance, used for the `WHATSAPP` channel. */
export class EvolutionProvider implements CommunicationProvider {
  public readonly providerType = CommunicationProviderType.EVOLUTION;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly instance: string;
  private readonly webhookSecret: string;
  private readonly timeoutMs: number;
  private readonly identity: ProviderIdentity;

  constructor(config: EvolutionConfig, timeoutMs: number = DEFAULT_TIMEOUT_MS) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.instance = config.instanceName;
    this.webhookSecret = config.webhookSecret;
    this.timeoutMs = timeoutMs;
    this.identity = {
      name: 'evolution',
      providerType: CommunicationProviderType.EVOLUTION,
      version: API_VERSION,
      instance: config.instanceName,
      apiVersion: API_VERSION,
    };
  }

  get metadata(): ProviderMetadata {
    return {
      identity: this.identity,
      supportsHealth: true,
      supportsWebhooks: true,
      supportsTemplates: false,
      supportsDeliveryReceipts: true,
      supportsReadReceipts: true,
      supportsTyping: true,
    };
  }

  async send(message: OutboundMessage): Promise<ProviderResponse> {
    const url = `${this.baseUrl}/message/sendText/${encodeURIComponent(this.instance)}`;
    try {
      const response = await requestJson({
        method: 'POST',
        url,
        timeoutMs: this.timeoutMs,
        headers: { apikey: this.apiKey },
        body: { number: message.to, text: message.body },
      });

      if (!response.ok) {
        return mapToProviderResponse(
          'error',
          response.data,
          extractError(response.data, response.text, response.status),
          this.identity,
        );
      }
      return mapToProviderResponse(
        'success',
        response.data,
        null,
        this.identity,
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      if (error instanceof HttpTransportError) {
        logger.error(
          { messageId: message.id, to: message.to, error: reason },
          'evolution transport error',
        );
      }
      return mapToProviderResponse('error', null, reason, this.identity);
    }
  }

  async health(): Promise<boolean> {
    const result = await probeHttp(
      'evolution',
      `${this.baseUrl}/`,
      this.timeoutMs,
      { apikey: this.apiKey },
    );
    return result.up;
  }

  async capabilities(): Promise<ChannelCapabilities> {
    return this.staticCapabilities();
  }

  /**
   * Accepts a webhook when any configured credential matches.
   *
   * The checks are tried in the order of the previous runtime: the Evolution
   * API key from a header or from the body, then a bearer token equal to the
   * webhook secret, then the HMAC signature. Failing all three is a rejection
   * - a webhook is never accepted because it presented no credential at all.
   */
  async verifyWebhook(
    headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<boolean> {
    const headerKey =
      readHeader(headers, 'apikey') ??
      readHeader(headers, 'x-api-key') ??
      readHeader(headers, 'apiKey');
    if (this.apiKey.length > 0) {
      if (verifyApiKey(headerKey, this.apiKey)) {
        return true;
      }
      if (verifyApiKey(extractApikey(body), this.apiKey)) {
        return true;
      }
    }

    if (this.webhookSecret.length > 0) {
      if (verifyBearerSecret(headers, this.webhookSecret)) {
        return true;
      }
      const signature =
        readHeader(headers, 'x-signature') ??
        readHeader(headers, 'x-evolution-signature');
      if (verifyEvolutionSignature(body, this.webhookSecret, signature)) {
        return true;
      }
    }

    logger.warn(
      {
        hasHeaderKey: headerKey !== null,
        hasSignature: readHeader(headers, 'x-signature') !== null,
        secretConfigured: this.webhookSecret.length > 0,
        apiKeyConfigured: this.apiKey.length > 0,
      },
      'evolution_webhook_verification_failed: no_matching_key_or_signature',
    );
    return false;
  }

  async handleWebhook(
    _headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<WebhookResult> {
    const payload = toWebhookPayload(decodeJson(body));
    const messageData = toMessageData(payload);

    switch (payload.event) {
      case 'messages.upsert':
        if (messageData === null) {
          return { kind: 'ignored' };
        }
        return {
          kind: 'inboundMessage',
          message: mapToInboundMessage(
            messageData,
            payload.instance.length > 0 ? payload.instance : null,
            CommunicationChannelType.WHATSAPP,
          ),
        };
      case 'messages.update':
        if (messageData === null) {
          return { kind: 'ignored' };
        }
        return {
          kind: 'deliveryReceipt',
          receipt: mapToDeliveryReceipt(messageData),
        };
      default:
        logger.debug(
          { event: payload.event },
          'evolution event ignored by the gateway',
        );
        return { kind: 'ignored' };
    }
  }

  private staticCapabilities(): ChannelCapabilities {
    return {
      ...EMPTY_CHANNEL_CAPABILITIES,
      supports_typing: true,
      supports_read_receipts: true,
      supports_delivery_status: true,
    };
  }
}

function readHeader(
  headers: Readonly<Record<string, string>>,
  name: string,
): string | null {
  const entry = Object.entries(headers).find(
    ([key]) => key.toLowerCase() === name,
  );
  return entry?.[1] ?? null;
}

function decodeJson(body: Buffer): unknown {
  try {
    return JSON.parse(body.toString('utf8'));
  } catch {
    return null;
  }
}

function extractApikey(body: Buffer): string | null {
  const decoded = decodeJson(body);
  if (typeof decoded !== 'object' || decoded === null) {
    return null;
  }
  const value = (decoded as Record<string, unknown>)['apikey'];
  return typeof value === 'string' ? value : null;
}

function toMessageData(
  payload: EvolutionWebhookPayload,
): EvolutionMessageData | null {
  const { data } = payload;
  if (typeof data !== 'object' || data === null) {
    return null;
  }
  const record = data as Record<string, unknown>;
  const key = record['key'];
  if (typeof key !== 'object' || key === null) {
    return null;
  }
  const message = record['message'];
  const messageType = record['messageType'];
  return {
    key: key as Record<string, unknown>,
    pushName: typeof record['pushName'] === 'string' ? record['pushName'] : '',
    message:
      typeof message === 'object' && message !== null
        ? (message as Record<string, unknown>)
        : null,
    messageType: typeof messageType === 'string' ? messageType : null,
  };
}

function extractError(
  data: Record<string, unknown> | null,
  text: string,
  status: number,
): string {
  if (data !== null) {
    for (const key of ['error', 'message', 'status'] as const) {
      const value = data[key];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
  }
  return text.length > 0 ? text : `HTTP ${String(status)}`;
}
