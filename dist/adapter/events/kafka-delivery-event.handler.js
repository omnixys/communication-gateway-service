import { getLogger } from '@omnixys/logger-ts';
const logger = getLogger('KafkaDeliveryEventHandler', 'class');
export const DELIVERY_STATUS_TOPIC = 'gateway.delivery.status';
export class KafkaDeliveryEventHandler {
    publisher;
    producer;
    mappingStore;
    task = null;
    constructor(publisher, producer, mappingStore) {
        this.publisher = publisher;
        this.producer = producer;
        this.mappingStore = mappingStore;
    }
    async start() {
        if (this.producer.enabled === false) {
            logger.info({ topic: DELIVERY_STATUS_TOPIC }, 'delivery_events_disabled');
            return;
        }
        this.task = this.run(this.publisher.subscribe('MessageDelivered'));
        logger.info({ topic: DELIVERY_STATUS_TOPIC }, 'kafka_delivery_handler_started');
    }
    async stop() {
        await this.publisher.close();
        await this.task;
        this.task = null;
        await this.producer.shutdown();
        logger.info('kafka_delivery_handler_stopped');
    }
    async run(stream) {
        for await (const event of stream) {
            if (event.kind !== 'MessageDelivered') {
                continue;
            }
            try {
                await this.publish(event);
            }
            catch (error) {
                logger.error({
                    providerMessageId: event.receipt.providerMessageId,
                    error: error instanceof Error ? error.message : String(error),
                }, 'kafka_delivery_publish_error');
            }
        }
    }
    async publish(event) {
        const { receipt } = event;
        let internalMessageId = '';
        let conversationId = '';
        let channel = 'WHATSAPP';
        try {
            const mapping = await this.mappingStore.getByProviderMessageId(receipt.providerMessageId);
            if (mapping === null) {
                logger.debug({ providerMessageId: receipt.providerMessageId }, 'mapping_not_found');
            }
            else {
                internalMessageId = mapping.internalId;
                conversationId = mapping.conversationId;
                channel = mapping.channel;
            }
        }
        catch (error) {
            logger.error({
                providerMessageId: receipt.providerMessageId,
                error: error instanceof Error ? error.message : String(error),
            }, 'mapping_lookup_error');
        }
        const payload = {
            messageId: internalMessageId,
            providerMessageId: receipt.providerMessageId,
            conversationId,
            channel,
            provider: receipt.providerType,
            status: receipt.status,
            timestamp: receipt.timestamp.toISOString(),
            error: receipt.error,
        };
        const key = internalMessageId.length > 0
            ? internalMessageId
            : receipt.providerMessageId;
        await this.producer.publishRaw(DELIVERY_STATUS_TOPIC, JSON.stringify(payload), key, { 'x-provider': receipt.providerType, 'x-status': receipt.status });
        logger.info({
            providerMessageId: receipt.providerMessageId,
            status: receipt.status,
            topic: DELIVERY_STATUS_TOPIC,
        }, 'kafka_delivery_published');
    }
}
