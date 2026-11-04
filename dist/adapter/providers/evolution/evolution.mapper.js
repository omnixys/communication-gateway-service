import { AttachmentType, CommunicationProviderType, DeliveryStatus, } from '../../../communication-gateway/models/enums/gateway.enums.js';
import { asNumber, asRecord, asText } from '../provider-value.mapper.js';
const WHATSAPP_SUFFIX = '@s.whatsapp.net';
function record(value) {
    return asRecord(value) ?? {};
}
function text(value, fallback = '') {
    return asText(value, fallback);
}
const MEDIA_KEYS = [
    ['imageMessage', AttachmentType.IMAGE],
    ['videoMessage', AttachmentType.VIDEO],
    ['audioMessage', AttachmentType.AUDIO],
    ['documentMessage', AttachmentType.DOCUMENT],
];
const RECEIPT_STATUS_MAP = {
    read: DeliveryStatus.READ,
    delivered: DeliveryStatus.DELIVERED,
    failed: DeliveryStatus.FAILED,
    sent: DeliveryStatus.SENT,
};
export function mapToProviderResponse(status, data, error, identity) {
    if (status === 'success' && data !== null) {
        const key = record(data['key']);
        const providerMessageId = text(key['id']);
        return {
            success: true,
            providerMessageId: providerMessageId.length > 0 ? providerMessageId : null,
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
export function mapToInboundMessage(messageData, providerInstance, channel) {
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
export function mapToDeliveryReceipt(messageData) {
    const messageId = text(messageData.key['id']);
    const status = RECEIPT_STATUS_MAP[messageData.messageType ?? ''] ?? DeliveryStatus.UNKNOWN;
    return {
        messageId,
        providerMessageId: messageId,
        providerType: CommunicationProviderType.EVOLUTION,
        status,
        timestamp: new Date(),
        error: null,
    };
}
export function toWebhookPayload(raw) {
    const envelope = record(raw);
    return {
        event: text(envelope['event']),
        instance: text(envelope['instance']),
        data: envelope['data'] ?? {},
    };
}
function extractBody(data) {
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
function extractAttachment(data) {
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
