import { getLogger } from '@omnixys/logger-ts';
import { ContextAccessor } from '@omnixys/context-ts';
const logger = getLogger('KafkaRawEventPublisher', 'class');
export class KafkaRawEventPublisher {
    producer;
    constructor(producer) {
        this.producer = producer;
    }
    get enabled() {
        return true;
    }
    async publishRaw(topic, value, key, headers = {}) {
        const correlationId = ContextAccessor.current()?.correlationId ?? null;
        try {
            await this.producer.rawSendWithHeaders(topic, value, {
                ...headers,
                ...(key === undefined ? {} : { 'x-key': key }),
                ...(correlationId === null
                    ? {}
                    : { 'x-correlation-id': correlationId }),
            });
        }
        catch (error) {
            logger.error({
                topic,
                error: error instanceof Error ? error.message : String(error),
            }, 'kafka_publish_error');
            throw error;
        }
        logger.debug({ topic, key }, 'kafka_raw_published');
    }
    async shutdown() {
        await this.producer.close();
    }
}
export class DisabledRawEventPublisher {
    get enabled() {
        return false;
    }
    async publishRaw(topic, _value, _key, _headers) {
        logger.debug({ topic }, 'raw event dropped, no broker configured');
    }
    async shutdown() {
        return Promise.resolve();
    }
}
