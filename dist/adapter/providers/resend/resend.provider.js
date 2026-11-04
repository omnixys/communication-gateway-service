import { getLogger } from '@omnixys/logger-ts';
import { EMPTY_CHANNEL_CAPABILITIES, } from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import { CommunicationProviderType, ContentType, DeliveryStatus, parseContentType, } from '../../../communication-gateway/models/enums/gateway.enums.js';
import { HttpTransportError, requestJson } from '../../http/json-request.js';
import { asText } from '../provider-value.mapper.js';
const logger = getLogger('ResendProvider', 'class');
const RESEND_AUTH_FAILED = 'RESEND_AUTH_FAILED';
const RESEND_RATE_LIMITED = 'RESEND_RATE_LIMITED';
const RESEND_UNAVAILABLE = 'RESEND_UNAVAILABLE';
const RESEND_REQUEST_REJECTED = 'RESEND_REQUEST_REJECTED';
const RESEND_NOT_CONFIGURED = 'RESEND_NOT_CONFIGURED';
export class ResendProvider {
    providerType = CommunicationProviderType.RESEND;
    baseUrl;
    apiKey;
    fromAddress;
    timeoutMs;
    identity;
    constructor(config) {
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
        const subject = asText(message.metadata['subject']).trim();
        const sender = asText(message.metadata['senderAddress'], this.fromAddress).trim();
        if (this.apiKey.length === 0 ||
            sender.length === 0 ||
            subject.length === 0) {
            return this.failure(RESEND_NOT_CONFIGURED);
        }
        logger.info({ messageId: message.id, to: message.to, subject }, 'resend_send_started');
        const body = {
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
                logger.info({ messageId: message.id, providerMessageId }, 'resend_send_success');
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
            logger.warn({
                messageId: message.id,
                to: message.to,
                statusCode: response.status,
                error,
            }, 'resend_send_failed');
            return this.failure(error, response.data);
        }
        catch (error) {
            const reason = error instanceof HttpTransportError && error.kind === 'timeout'
                ? `${RESEND_UNAVAILABLE}: timeout`
                : RESEND_UNAVAILABLE;
            logger.warn({ messageId: message.id, to: message.to, error: String(error) }, 'resend_send_unavailable');
            return this.failure(reason);
        }
    }
    async health() {
        return this.apiKey.length > 0 && this.fromAddress.length > 0;
    }
    async capabilities() {
        return {
            ...EMPTY_CHANNEL_CAPABILITIES,
            supports_rich_text: true,
            supports_formatting: true,
        };
    }
    async verifyWebhook() {
        return false;
    }
    async handleWebhook() {
        return { kind: 'ignored' };
    }
    errorCode(status, data) {
        if (status === 401 || status === 403) {
            return RESEND_AUTH_FAILED;
        }
        if (status === 400) {
            const message = asText(data?.['message']).toLowerCase();
            if (message.includes('api key') &&
                (message.includes('invalid') || message.includes('missing'))) {
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
