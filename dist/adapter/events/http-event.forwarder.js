import { getLogger } from '@omnixys/logger-ts';
import { requestJson } from '../http/json-request.js';
const logger = getLogger('HttpEventForwarder', 'class');
export class HttpEventForwarder {
    publisher;
    targets;
    mappingStore;
    config;
    chatServiceUrl;
    notificationServiceUrl;
    whatsappSupportEventMap;
    inboundTask = null;
    deliveryTask = null;
    ready = false;
    constructor(publisher, targets, mappingStore, config, whatsappSupportEventMap) {
        this.publisher = publisher;
        this.targets = targets;
        this.mappingStore = mappingStore;
        this.config = config;
        this.chatServiceUrl = targets.chatServiceUrl.replace(/\/+$/, '');
        this.notificationServiceUrl = targets.notificationServiceUrl.replace(/\/+$/, '');
        this.whatsappSupportEventMap = whatsappSupportEventMap;
    }
    get isReady() {
        return this.ready;
    }
    async start() {
        const inbound = this.publisher.subscribe('InboundMessageReceived');
        const deliveries = this.publisher.subscribe('MessageDelivered');
        this.inboundTask = this.consumeInbound(inbound);
        this.deliveryTask = this.consumeDeliveries(deliveries);
        this.ready = true;
        logger.info({ chatServiceUrl: this.chatServiceUrl }, 'http_event_forwarder_started');
    }
    async stop() {
        this.ready = false;
        await this.publisher.close();
        await Promise.all([this.inboundTask, this.deliveryTask]);
        this.inboundTask = null;
        this.deliveryTask = null;
        logger.info('http_event_forwarder_stopped');
    }
    async consumeInbound(stream) {
        for await (const event of stream) {
            if (event.kind !== 'InboundMessageReceived') {
                continue;
            }
            try {
                await this.forwardInbound(event);
            }
            catch (error) {
                logger.error({ error: error instanceof Error ? error.message : String(error) }, 'http_event_forwarder_inbound_error');
            }
        }
    }
    async consumeDeliveries(stream) {
        for await (const event of stream) {
            if (event.kind !== 'MessageDelivered') {
                continue;
            }
            try {
                await this.forwardDelivery(event);
            }
            catch (error) {
                logger.error({ error: error instanceof Error ? error.message : String(error) }, 'http_event_forwarder_delivery_error');
            }
        }
    }
    async forwardInbound(event) {
        const { message } = event;
        const route = message.providerInstance === null
            ? undefined
            : this.whatsappSupportEventMap[message.providerInstance];
        if (route === undefined) {
            logger.warn({
                provider: message.providerType,
                providerInstance: message.providerInstance,
                messageId: message.messageId,
            }, 'whatsapp_support_event_route_missing');
            return;
        }
        const result = await this.postWithRetry(`${this.notificationServiceUrl}/internal/support/inbound-message`, {
            externalId: message.messageId,
            tenantId: route.tenantId,
            eventId: route.eventId,
            from: message.from,
            senderName: message.senderName,
            body: message.body,
            mediaUrl: message.attachment?.url ?? null,
            mimeType: message.attachment?.mimeType ?? null,
        }, { 'x-internal-token': this.targets.notificationServiceApiKey });
        if (result.ok) {
            logger.info({ messageId: message.messageId, channel: message.channel.type }, 'forward_inbound_support_success');
            return;
        }
        logger.warn({
            messageId: message.messageId,
            status: result.status,
            attempts: result.attempts,
        }, 'forward_inbound_support_failed');
    }
    async forwardDelivery(event) {
        const { receipt } = event;
        let internalMessageId = '';
        let conversationId = '';
        try {
            const mapping = await this.mappingStore.getByProviderMessageId(receipt.providerMessageId);
            if (mapping !== null) {
                internalMessageId = mapping.internalId;
                conversationId = mapping.conversationId;
            }
        }
        catch (error) {
            logger.error({
                providerMessageId: receipt.providerMessageId,
                error: error instanceof Error ? error.message : String(error),
            }, 'mapping_lookup_error');
        }
        const result = await this.postWithRetry(`${this.chatServiceUrl}/api/v1/internal/delivery-status`, {
            provider_message_id: receipt.providerMessageId,
            status: receipt.status,
            error: receipt.error,
            timestamp: receipt.timestamp.toISOString(),
            internal_message_id: internalMessageId,
            conversation_id: conversationId,
        }, { 'x-api-key': this.targets.chatServiceApiKey });
        if (result.ok) {
            logger.info({
                providerMessageId: receipt.providerMessageId,
                status: receipt.status,
            }, 'forward_delivery_success');
            return;
        }
        logger.warn({
            providerMessageId: receipt.providerMessageId,
            status: result.status,
            attempts: result.attempts,
        }, 'forward_delivery_failed');
    }
    async postWithRetry(url, body, headers) {
        let attempt = 0;
        let status = 0;
        while (attempt < this.config.maxAttempts) {
            attempt += 1;
            try {
                const response = await requestJson({
                    method: 'POST',
                    url,
                    timeoutMs: this.config.timeoutMs,
                    headers,
                    body,
                });
                status = response.status;
                if (response.ok) {
                    return { ok: true, status, attempts: attempt };
                }
                if (!isRetryableStatus(response.status)) {
                    return { ok: false, status, attempts: attempt };
                }
            }
            catch (error) {
                logger.warn({
                    url,
                    attempt,
                    error: error instanceof Error ? error.message : String(error),
                }, 'forward_attempt_failed');
            }
            if (attempt < this.config.maxAttempts) {
                await delay(backoffDelay(attempt, this.config));
            }
        }
        return { ok: false, status, attempts: attempt };
    }
}
function isRetryableStatus(status) {
    return status === 408 || status === 429 || status >= 500;
}
export function backoffDelay(attempt, config) {
    const exponential = Math.min(config.maxDelayMs, config.baseDelayMs * 2 ** (attempt - 1));
    return Math.round(exponential * (0.5 + Math.random() * 0.5));
}
function delay(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds).unref();
    });
}
