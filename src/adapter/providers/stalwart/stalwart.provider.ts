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

import { randomUUID } from 'node:crypto';

import { getLogger } from '@omnixys/logger-ts';

import {
  EMPTY_CHANNEL_CAPABILITIES,
  type ChannelCapabilities,
} from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import type { OutboundMessage } from '../../../communication-gateway/models/entities/outbound-message.model.js';
import type { ProviderIdentity } from '../../../communication-gateway/models/entities/provider-identity.model.js';
import type { ProviderMetadata } from '../../../communication-gateway/models/entities/provider-metadata.model.js';
import {
  CommunicationProviderType,
  ContentType,
  DeliveryStatus,
  parseContentType,
} from '../../../communication-gateway/models/enums/gateway.enums.js';
import type {
  CommunicationProvider,
  WebhookResult,
} from '../../../communication-gateway/models/interfaces/communication-provider.port.js';
import type { ProviderResponse } from '../../../communication-gateway/models/payloads/provider-response.model.js';
import type { StalwartConfig } from '../../../config/config.types.js';
import { asText } from '../../../core/coerce.js';
import { SmtpClient, SmtpError, type SmtpEnvelope } from './smtp-client.js';

const logger = getLogger('StalwartProvider', 'class');

const TOKEN_EXPIRY_MARGIN_SECONDS = 30;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300;
const DEFAULT_SUBJECT = 'No Subject';

/** Adapter for a Stalwart mail server, used for the `EMAIL` channel. */
export class StalwartProvider implements CommunicationProvider {
  public readonly providerType = CommunicationProviderType.STALWART;

  private readonly config: StalwartConfig;
  private readonly identity: ProviderIdentity;
  private readonly client: SmtpClient;
  private token: string | null = null;
  private tokenExpiresAtMs = 0;

  constructor(config: StalwartConfig) {
    this.config = config;
    this.identity = {
      name: 'Stalwart',
      providerType: CommunicationProviderType.STALWART,
      version: '1.0.0',
      instance: 'stalwart-mail',
      apiVersion: '1.0',
    };
    this.client = new SmtpClient(
      {
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        authMode: config.authMode,
      },
      {
        tlsEnabled: config.tlsEnabled,
        tlsVerify: config.tlsVerify,
        timeoutMs: config.timeout * 1000,
      },
      () => this.oauthToken(),
    );
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
    if (this.config.host.length === 0 || this.config.fromAddress.length === 0) {
      return this.failure('STALWART_NOT_CONFIGURED');
    }

    const envelope: SmtpEnvelope = {
      from: this.config.fromAddress,
      to: message.to,
      raw: this.buildMime(message),
    };

    try {
      if (this.config.authMode === 'oauthbearer') {
        await this.sendWithOAuth(message, envelope);
      } else {
        await this.client.send(envelope);
      }
      logger.info(
        { messageId: message.id, to: message.to },
        'stalwart_send_success',
      );
      return {
        success: true,
        providerMessageId: message.id,
        status: DeliveryStatus.SENT,
        error: null,
        raw: null,
        providerIdentity: this.identity,
      };
    } catch (error) {
      return this.failure(this.errorCode(error), null);
    }
  }

  async health(): Promise<boolean> {
    try {
      return await this.client.probe();
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : String(error) },
        'stalwart_health_check_failed',
      );
      return false;
    }
  }

  async capabilities(): Promise<ChannelCapabilities> {
    return {
      ...EMPTY_CHANNEL_CAPABILITIES,
      supports_attachments: true,
      supports_rich_text: true,
      supports_formatting: true,
      supports_quoted_replies: true,
      supports_forwarding: true,
    };
  }

  /** Stalwart does not push webhooks to this service in v1. */
  async verifyWebhook(): Promise<boolean> {
    return false;
  }

  /** Stalwart does not push webhooks to this service in v1. */
  async handleWebhook(): Promise<WebhookResult> {
    return { kind: 'ignored' };
  }

  /**
   * Sends a message and retries once with a refreshed OAuth token.
   *
   * A token can expire between the cached read and the `AUTH` exchange, so the
   * single forced refresh mirrors the behaviour of the previous runtime.
   */
  private async sendWithOAuth(
    message: OutboundMessage,
    envelope: SmtpEnvelope,
  ): Promise<void> {
    try {
      await this.client.send(envelope);
    } catch (error) {
      if (!(error instanceof SmtpError) || error.command !== 'AUTH XOAUTH2') {
        throw error;
      }
      logger.info({ messageId: message.id }, 'smtp_oauth_token_refresh');
      this.token = null;
      await this.client.send(envelope);
    }
  }

  /** Fetches and caches an OAuth2 access token for OAUTHBEARER auth. */
  private async oauthToken(): Promise<string> {
    if (this.token !== null && Date.now() < this.tokenExpiresAtMs) {
      return this.token;
    }
    const { oauthTokenUrl, oauthClientId, oauthClientSecret } = this.config;
    if (
      oauthTokenUrl.length === 0 ||
      oauthClientId.length === 0 ||
      oauthClientSecret.length === 0
    ) {
      throw new SmtpError(
        'Stalwart OAUTHBEARER requires token URL, client ID, and client secret',
        'AUTH XOAUTH2',
      );
    }

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: oauthClientId,
      client_secret: oauthClientSecret,
    });
    const response = await fetch(oauthTokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: body.toString(),
      signal: AbortSignal.timeout(this.config.timeout * 1000),
    });
    if (!response.ok) {
      throw new SmtpError(
        `OIDC token request failed with HTTP ${String(response.status)}`,
        'AUTH XOAUTH2',
      );
    }
    const payload = (await response.json()) as {
      access_token?: unknown;
      expires_in?: unknown;
    };
    if (
      typeof payload.access_token !== 'string' ||
      payload.access_token.length === 0
    ) {
      throw new SmtpError(
        'OIDC token response did not contain access_token',
        'AUTH XOAUTH2',
      );
    }

    const lifetime = Number.isFinite(Number(payload.expires_in))
      ? Math.max(0, Number(payload.expires_in))
      : DEFAULT_TOKEN_LIFETIME_SECONDS;
    this.token = payload.access_token;
    this.tokenExpiresAtMs =
      Date.now() + Math.max(0, lifetime - TOKEN_EXPIRY_MARGIN_SECONDS) * 1000;
    return this.token;
  }

  /** Builds the RFC 5322 message for one outbound email. */
  private buildMime(message: OutboundMessage): string {
    const subject = asText(message.metadata['subject'], DEFAULT_SUBJECT);
    const boundary = `----Omnixys${randomUUID().replaceAll('-', '')}`;
    const isHtml = parseContentType(message.contentType) === ContentType.HTML;
    const lines: string[] = [
      `Date: ${new Date().toUTCString()}`,
      `From: ${this.config.fromAddress}`,
      `To: ${message.to}`,
      `Subject: ${encodeHeaderValue(subject)}`,
      `Message-ID: <${message.id}@omnixys>`,
      'MIME-Version: 1.0',
    ];

    if (message.attachment === null) {
      lines.push(
        `Content-Type: text/${isHtml ? 'html' : 'plain'}; charset=utf-8`,
        'Content-Transfer-Encoding: 8bit',
        '',
        message.body,
      );
      return lines.join('\r\n');
    }

    const attachment = message.attachment;
    const maintype = attachment.mimeType.split('/')[0] ?? 'application';
    const subtype = attachment.mimeType.split('/')[1] ?? 'octet-stream';
    lines.push(
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      `Content-Type: text/${isHtml ? 'html' : 'plain'}; charset=utf-8`,
      'Content-Transfer-Encoding: 8bit',
      '',
      message.body,
      '',
      `--${boundary}`,
      `Content-Type: ${maintype}/${subtype}; name="${attachment.filename}"`,
      'Content-Disposition: attachment; filename="' + `${attachment.filename}"`,
      'Content-Transfer-Encoding: base64',
      '',
      Buffer.from(attachment.url, 'utf8').toString('base64'),
      '',
      `--${boundary}--`,
    );
    return lines.join('\r\n');
  }

  private errorCode(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof SmtpError) {
      if (error.command === 'CONNECT') {
        return `SMTP_CONNECTION_FAILED: ${message}`;
      }
      return `SMTP_ERROR: ${message}`;
    }
    const code =
      error !== null && typeof error === 'object' && 'code' in error
        ? String(error.code)
        : '';
    if (
      code === 'ECONNREFUSED' ||
      code === 'ENOTFOUND' ||
      code === 'ETIMEDOUT'
    ) {
      return `SMTP_CONNECTION_FAILED: ${message}`;
    }
    return `EMAIL_SEND_FAILED: ${message}`;
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

/** Encodes a header value when it contains non-ASCII characters. */
function encodeHeaderValue(value: string): string {
  if (!/^[\x20-\x7e]*$/.test(value)) {
    return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
  }
  return value;
}
