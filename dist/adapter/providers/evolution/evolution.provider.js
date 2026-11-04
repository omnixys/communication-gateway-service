import { getLogger } from '@omnixys/logger-ts';
import { EMPTY_CHANNEL_CAPABILITIES, } from '../../../communication-gateway/models/entities/channel-capabilities.model.js';
import { CommunicationChannelType, CommunicationProviderType, } from '../../../communication-gateway/models/enums/gateway.enums.js';
import { HttpTransportError, probeHttp, requestJson, } from '../../http/json-request.js';
import { mapToDeliveryReceipt, mapToInboundMessage, mapToProviderResponse, toWebhookPayload, } from './evolution.mapper.js';
import { verifyApiKey, verifyBearerSecret, verifyEvolutionSignature, } from './evolution.webhook-verifier.js';
const logger = getLogger('EvolutionProvider', 'class');
const API_VERSION = 'v1';
const DEFAULT_TIMEOUT_MS = 30_000;
export class EvolutionProvider {
    providerType = CommunicationProviderType.EVOLUTION;
    baseUrl;
    apiKey;
    instance;
    webhookSecret;
    timeoutMs;
    identity;
    constructor(config, timeoutMs = DEFAULT_TIMEOUT_MS) {
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
    get metadata() {
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
    async send(message) {
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
                return mapToProviderResponse('error', response.data, extractError(response.data, response.text, response.status), this.identity);
            }
            return mapToProviderResponse('success', response.data, null, this.identity);
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            if (error instanceof HttpTransportError) {
                logger.error({ messageId: message.id, to: message.to, error: reason }, 'evolution transport error');
            }
            return mapToProviderResponse('error', null, reason, this.identity);
        }
    }
    async health() {
        const result = await probeHttp('evolution', `${this.baseUrl}/`, this.timeoutMs, { apikey: this.apiKey });
        return result.up;
    }
    async capabilities() {
        return this.staticCapabilities();
    }
    async verifyWebhook(headers, body) {
        const headerKey = readHeader(headers, 'apikey') ??
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
            const signature = readHeader(headers, 'x-signature') ??
                readHeader(headers, 'x-evolution-signature');
            if (verifyEvolutionSignature(body, this.webhookSecret, signature)) {
                return true;
            }
        }
        logger.warn({
            hasHeaderKey: headerKey !== null,
            hasSignature: readHeader(headers, 'x-signature') !== null,
            secretConfigured: this.webhookSecret.length > 0,
            apiKeyConfigured: this.apiKey.length > 0,
        }, 'evolution_webhook_verification_failed: no_matching_key_or_signature');
        return false;
    }
    async handleWebhook(_headers, body) {
        const payload = toWebhookPayload(decodeJson(body));
        const messageData = toMessageData(payload);
        switch (payload.event) {
            case 'messages.upsert':
                if (messageData === null) {
                    return { kind: 'ignored' };
                }
                return {
                    kind: 'inboundMessage',
                    message: mapToInboundMessage(messageData, payload.instance.length > 0 ? payload.instance : null, CommunicationChannelType.WHATSAPP),
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
                logger.debug({ event: payload.event }, 'evolution event ignored by the gateway');
                return { kind: 'ignored' };
        }
    }
    staticCapabilities() {
        return {
            ...EMPTY_CHANNEL_CAPABILITIES,
            supports_typing: true,
            supports_read_receipts: true,
            supports_delivery_status: true,
        };
    }
}
function readHeader(headers, name) {
    const entry = Object.entries(headers).find(([key]) => key.toLowerCase() === name);
    return entry?.[1] ?? null;
}
function decodeJson(body) {
    try {
        return JSON.parse(body.toString('utf8'));
    }
    catch {
        return null;
    }
}
function extractApikey(body) {
    const decoded = decodeJson(body);
    if (typeof decoded !== 'object' || decoded === null) {
        return null;
    }
    const value = decoded['apikey'];
    return typeof value === 'string' ? value : null;
}
function toMessageData(payload) {
    const { data } = payload;
    if (typeof data !== 'object' || data === null) {
        return null;
    }
    const record = data;
    const key = record['key'];
    if (typeof key !== 'object' || key === null) {
        return null;
    }
    const message = record['message'];
    const messageType = record['messageType'];
    return {
        key: key,
        pushName: typeof record['pushName'] === 'string' ? record['pushName'] : '',
        message: typeof message === 'object' && message !== null
            ? message
            : null,
        messageType: typeof messageType === 'string' ? messageType : null,
    };
}
function extractError(data, text, status) {
    if (data !== null) {
        for (const key of ['error', 'message', 'status']) {
            const value = data[key];
            if (typeof value === 'string' && value.length > 0) {
                return value;
            }
        }
    }
    return text.length > 0 ? text : `HTTP ${String(status)}`;
}
