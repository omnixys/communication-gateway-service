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
  CommunicationProviderType,
  ContentType,
  DeliveryStatus,
  parseContentType,
} from '../../../communication-gateway/domain/enums.js';
import {
  EMPTY_CHANNEL_CAPABILITIES,
  type ChannelCapabilities,
} from '../../../communication-gateway/domain/models/channel-capabilities.model.js';
import type { OutboundMessage } from '../../../communication-gateway/domain/models/outbound-message.model.js';
import type { ProviderIdentity } from '../../../communication-gateway/domain/models/provider-identity.model.js';
import type { ProviderMetadata } from '../../../communication-gateway/domain/models/provider-metadata.model.js';
import type { ProviderResponse } from '../../../communication-gateway/domain/models/provider-response.model.js';
import type {
  CommunicationProvider,
  WebhookResult,
} from '../../../communication-gateway/ports/communication-provider.port.js';
import type { ResendConfig } from '../../../config/config.types.js';
import { asText } from '../../../core/coerce.js';
import { HttpTransportError, requestJson } from '../../../core/http-client.js';

const logger = getLogger('ResendProvider', 'class');

/** Stable error codes reported for a rejected Resend delivery. */
const RESEND_AUTH_FAILED = 'RESEND_AUTH_FAILED';
const RESEND_RATE_LIMITED = 'RESEND_RATE_LIMITED';
const RESEND_UNAVAILABLE = 'RESEND_UNAVAILABLE';
const RESEND_REQUEST_REJECTED = 'RESEND_REQUEST_REJECTED';
const RESEND_NOT_CONFIGURED = 'RESEND_NOT_CONFIGURED';

/** Adapter for the Resend email API, used for the `EMAIL` channel. */
export class ResendProvider implements CommunicationProvider {
  public readonly providerType = CommunicationProviderType.RESEND;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fromAddress: string;
  private readonly timeoutMs: number;
  private readonly identity: ProviderIdentity;

  constructor(config: ResendConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.fromAddress = config.fromAddress;
    this.timeoutMs = config.timeout * 1000;
    this.identity = {
      name: 'Resend',
      providerType: CommunicationProviderType.RESEND,
      version: '1.0.0',
      instance: 'resend-email',
      apiVersion: 'v1',
    };
  }

  get metadata(): ProviderMetadata {
    return {
      identity: this.identity,
      supportsHealth: true,
      supportsWebhooks: false,
      supportsTemplates: false,
      supportsDeliveryReceipts: false,
      supportsReadReceipts: false,
      supportsTyping: false,
    };
  }

  async send(message: OutboundMessage): Promise<ProviderResponse> {
    const subject = asText(message.metadata['subject']).trim();
    const sender = asText(
      message.metadata['senderAddress'],
      this.fromAddress,
    ).trim();

    if (
      this.apiKey.length === 0 ||
      sender.length === 0 ||
      subject.length === 0
    ) {
      return this.failure(RESEND_NOT_CONFIGURED);
    }

    logger.info(
      { messageId: message.id, to: message.to, subject },
      'resend_send_started',
    );

    const body: Record<string, unknown> = {
      from: sender,
      to: [message.to],
      subject,
      [parseContentType(message.contentType) === ContentType.HTML
        ? 'html'
        : 'text']: message.body,
    };

    try {
      const response = await requestJson({
        method: 'POST',
        url: `${this.baseUrl}/emails`,
        timeoutMs: this.timeoutMs,
        headers: { Authorization: `Bearer ${this.apiKey}` },
        body,
      });

      const providerMessageId = response.data?.['id'];
      if (response.ok && typeof providerMessageId === 'string') {
        logger.info(
          { messageId: message.id, providerMessageId },
          'resend_send_success',
        );
        return {
          success: true,
          providerMessageId,
          status: DeliveryStatus.SENT,
          error: null,
          raw: response.data,
          providerIdentity: this.identity,
        };
      }

      const error = this.errorCode(response.status, response.data);
      logger.warn(
        {
          messageId: message.id,
          to: message.to,
          statusCode: response.status,
          error,
        },
        'resend_send_failed',
      );
      return this.failure(error, response.data);
    } catch (error) {
      const reason =
        error instanceof HttpTransportError && error.kind === 'timeout'
          ? `${RESEND_UNAVAILABLE}: timeout`
          : RESEND_UNAVAILABLE;
      logger.warn(
        { messageId: message.id, to: message.to, error: String(error) },
        'resend_send_unavailable',
      );
      return this.failure(reason);
    }
  }

  async health(): Promise<boolean> {
    return this.apiKey.length > 0 && this.fromAddress.length > 0;
  }

  async capabilities(): Promise<ChannelCapabilities> {
    return {
      ...EMPTY_CHANNEL_CAPABILITIES,
      supports_rich_text: true,
      supports_formatting: true,
    };
  }

  /** Resend does not push webhooks to this service in v1. */
  async verifyWebhook(): Promise<boolean> {
    return false;
  }

  /** Resend does not push webhooks to this service in v1. */
  async handleWebhook(): Promise<WebhookResult> {
    return { kind: 'ignored' };
  }

  private errorCode(
    status: number,
    data: Record<string, unknown> | null,
  ): string {
    if (status === 401 || status === 403) {
      return RESEND_AUTH_FAILED;
    }
    if (status === 400) {
      const message = asText(data?.['message']).toLowerCase();
      if (
        message.includes('api key') &&
        (message.includes('invalid') || message.includes('missing'))
      ) {
        return RESEND_AUTH_FAILED;
      }
    }
    if (status === 429) {
      return RESEND_RATE_LIMITED;
    }
    if (status >= 500) {
      return RESEND_UNAVAILABLE;
    }
    return RESEND_REQUEST_REJECTED;
  }

  private failure(
    error: string,
    raw: Record<string, unknown> | null = null,
  ): ProviderResponse {
    return {
      success: false,
      providerMessageId: null,
      status: DeliveryStatus.FAILED,
      error,
      raw,
      providerIdentity: this.identity,
    };
  }
}
