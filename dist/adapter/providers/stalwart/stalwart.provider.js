import { randomUUID } from 'node:crypto';
import { getLogger } from '@omnixys/logger-ts';
import { EMPTY_CHANNEL_CAPABILITIES, } from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import { CommunicationProviderType, ContentType, DeliveryStatus, parseContentType, } from '../../../communication-gateway/models/enums/gateway.enums.js';
import { asText } from '../provider-value.mapper.js';
import { SmtpClient, SmtpError } from './smtp-client.js';
const logger = getLogger('StalwartProvider', 'class');
const TOKEN_EXPIRY_MARGIN_SECONDS = 30;
const DEFAULT_TOKEN_LIFETIME_SECONDS = 300;
const DEFAULT_SUBJECT = 'No Subject';
export class StalwartProvider {
    providerType = CommunicationProviderType.STALWART;
    config;
    identity;
    client;
    token = null;
    tokenExpiresAtMs = 0;
    constructor(config) {
        this.config = config;
        this.identity = {
            name: 'Stalwart',
            providerType: CommunicationProviderType.STALWART,
            version: '1.0.0',
            instance: 'stalwart-mail',
            apiVersion: '1.0',
        };
        this.client = new SmtpClient({
            host: config.host,
            port: config.port,
            username: config.username,
            password: config.password,
            authMode: config.authMode,
        }, {
            tlsEnabled: config.tlsEnabled,
            tlsVerify: config.tlsVerify,
            timeoutMs: config.timeout * 1000,
        }, () => this.oauthToken());
    }
    get metadata() {
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
    async send(message) {
        if (this.config.host.length === 0 || this.config.fromAddress.length === 0) {
            return this.failure('STALWART_NOT_CONFIGURED');
        }
        const envelope = {
            from: this.config.fromAddress,
            to: message.to,
            raw: this.buildMime(message),
        };
        try {
            if (this.config.authMode === 'oauthbearer') {
                await this.sendWithOAuth(message, envelope);
            }
            else {
                await this.client.send(envelope);
            }
            logger.info({ messageId: message.id, to: message.to }, 'stalwart_send_success');
            return {
                success: true,
                providerMessageId: message.id,
                status: DeliveryStatus.SENT,
                error: null,
                raw: null,
                providerIdentity: this.identity,
            };
        }
        catch (error) {
            return this.failure(this.errorCode(error), null);
        }
    }
    async health() {
        try {
            return await this.client.probe();
        }
        catch (error) {
            logger.warn({ error: error instanceof Error ? error.message : String(error) }, 'stalwart_health_check_failed');
            return false;
        }
    }
    async capabilities() {
        return {
            ...EMPTY_CHANNEL_CAPABILITIES,
            supports_attachments: true,
            supports_rich_text: true,
            supports_formatting: true,
            supports_quoted_replies: true,
            supports_forwarding: true,
        };
    }
    async verifyWebhook() {
        return false;
    }
    async handleWebhook() {
        return { kind: 'ignored' };
    }
    async sendWithOAuth(message, envelope) {
        try {
            await this.client.send(envelope);
        }
        catch (error) {
            if (!(error instanceof SmtpError) || error.command !== 'AUTH XOAUTH2') {
                throw error;
            }
            logger.info({ messageId: message.id }, 'smtp_oauth_token_refresh');
            this.token = null;
            await this.client.send(envelope);
        }
    }
    async oauthToken() {
        if (this.token !== null && Date.now() < this.tokenExpiresAtMs) {
            return this.token;
        }
        const { oauthTokenUrl, oauthClientId, oauthClientSecret } = this.config;
        if (oauthTokenUrl.length === 0 ||
            oauthClientId.length === 0 ||
            oauthClientSecret.length === 0) {
            throw new SmtpError('Stalwart OAUTHBEARER requires token URL, client ID, and client secret', 'AUTH XOAUTH2');
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
            throw new SmtpError(`OIDC token request failed with HTTP ${String(response.status)}`, 'AUTH XOAUTH2');
        }
        const payload = (await response.json());
        if (typeof payload.access_token !== 'string' ||
            payload.access_token.length === 0) {
            throw new SmtpError('OIDC token response did not contain access_token', 'AUTH XOAUTH2');
        }
        const lifetime = Number.isFinite(Number(payload.expires_in))
            ? Math.max(0, Number(payload.expires_in))
            : DEFAULT_TOKEN_LIFETIME_SECONDS;
        this.token = payload.access_token;
        this.tokenExpiresAtMs =
            Date.now() + Math.max(0, lifetime - TOKEN_EXPIRY_MARGIN_SECONDS) * 1000;
        return this.token;
    }
    buildMime(message) {
        const subject = asText(message.metadata['subject'], DEFAULT_SUBJECT);
        const boundary = `----Omnixys${randomUUID().replaceAll('-', '')}`;
        const isHtml = parseContentType(message.contentType) === ContentType.HTML;
        const lines = [
            `Date: ${new Date().toUTCString()}`,
            `From: ${this.config.fromAddress}`,
            `To: ${message.to}`,
            `Subject: ${encodeHeaderValue(subject)}`,
            `Message-ID: <${message.id}@omnixys>`,
            'MIME-Version: 1.0',
        ];
        if (message.attachment === null) {
            lines.push(`Content-Type: text/${isHtml ? 'html' : 'plain'}; charset=utf-8`, 'Content-Transfer-Encoding: 8bit', '', message.body);
            return lines.join('\r\n');
        }
        const attachment = message.attachment;
        const maintype = attachment.mimeType.split('/')[0] ?? 'application';
        const subtype = attachment.mimeType.split('/')[1] ?? 'octet-stream';
        lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`, '', `--${boundary}`, `Content-Type: text/${isHtml ? 'html' : 'plain'}; charset=utf-8`, 'Content-Transfer-Encoding: 8bit', '', message.body, '', `--${boundary}`, `Content-Type: ${maintype}/${subtype}; name="${attachment.filename}"`, 'Content-Disposition: attachment; filename="' + `${attachment.filename}"`, 'Content-Transfer-Encoding: base64', '', Buffer.from(attachment.url, 'utf8').toString('base64'), '', `--${boundary}--`);
        return lines.join('\r\n');
    }
    errorCode(error) {
        const message = error instanceof Error ? error.message : String(error);
        if (error instanceof SmtpError) {
            if (error.command === 'CONNECT') {
                return `SMTP_CONNECTION_FAILED: ${message}`;
            }
            return `SMTP_ERROR: ${message}`;
        }
        const code = error !== null && typeof error === 'object' && 'code' in error
            ? String(error.code)
            : '';
        if (code === 'ECONNREFUSED' ||
            code === 'ENOTFOUND' ||
            code === 'ETIMEDOUT') {
            return `SMTP_CONNECTION_FAILED: ${message}`;
        }
        return `EMAIL_SEND_FAILED: ${message}`;
    }
    failure(error, raw = null) {
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
function encodeHeaderValue(value) {
    if (!/^[\x20-\x7e]*$/.test(value)) {
        return `=?UTF-8?B?${Buffer.from(value, 'utf8').toString('base64')}?=`;
    }
    return value;
}
