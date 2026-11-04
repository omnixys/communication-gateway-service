import { getLogger } from '@omnixys/logger-ts';
import { WebhookVerificationError } from '../errors/gateway.errors.js';
import { assertValidTransition } from './delivery-lifecycle.service.js';
const logger = getLogger('WebhookService', 'class');
export class WebhookService {
    registry;
    publisher;
    mappingStore;
    constructor(registry, publisher, mappingStore) {
        this.registry = registry;
        this.publisher = publisher;
        this.mappingStore = mappingStore;
    }
    async processWebhook(providerType, headers, body) {
        logger.info({ providerType }, 'webhook processing started');
        const provider = this.registry.getByProviderType(providerType);
        if (provider === null) {
            throw new WebhookVerificationError(providerType);
        }
        if (!(await provider.verifyWebhook(headers, body))) {
            throw new WebhookVerificationError(providerType);
        }
        const result = await provider.handleWebhook(headers, body);
        switch (result.kind) {
            case 'deliveryReceipt':
                await this.processReceipt(result.receipt);
                return 'DELIVERY_RECEIPT';
            case 'inboundMessage':
                await this.processInboundMessage(result.message);
                return 'INBOUND_MESSAGE';
            case 'ignored':
                return 'IGNORED';
        }
    }
    async processInboundMessage(message) {
        const existing = await this.mappingStore.findByProviderAndProviderMessageId(message.providerType, message.messageId);
        if (existing !== null) {
            logger.info({
                provider: message.providerType,
                messageId: message.messageId,
                status: existing.status,
            }, 'duplicate webhook skipped');
            return;
        }
        const event = {
            kind: 'InboundMessageReceived',
            message,
        };
        await this.publisher.publish(event);
        logger.info({
            provider: message.providerType,
            messageId: message.messageId,
        }, 'inbound message published');
    }
    async processReceipt(receipt) {
        const existing = await this.mappingStore.findByProviderAndProviderMessageId(receipt.providerType, receipt.providerMessageId);
        if (existing !== null) {
            if (existing.status === receipt.status) {
                logger.info({
                    provider: receipt.providerType,
                    providerMessageId: receipt.providerMessageId,
                    status: receipt.status,
                }, 'duplicate delivery receipt skipped');
                return;
            }
            assertValidTransition(existing.status, receipt.status);
            await this.mappingStore.updateStatus(receipt.providerMessageId, receipt.status, receipt.error);
            logger.info({
                provider: receipt.providerType,
                providerMessageId: receipt.providerMessageId,
                status: receipt.status,
            }, 'delivery status update applied');
        }
        const event = { kind: 'MessageDelivered', receipt };
        await this.publisher.publish(event);
        logger.info({
            provider: receipt.providerType,
            providerMessageId: receipt.providerMessageId,
        }, 'message delivered event published');
    }
}
