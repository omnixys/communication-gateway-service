import type { KafkaProducerService } from '@omnixys/kafka-ts';
import type { RawEventPublisher } from '../../communication-gateway/models/interfaces/raw-event-publisher.port.js';
export declare class KafkaRawEventPublisher implements RawEventPublisher {
    private readonly producer;
    constructor(producer: KafkaProducerService);
    get enabled(): boolean;
    publishRaw(topic: string, value: string, key?: string, headers?: Readonly<Record<string, string>>): Promise<void>;
    shutdown(): Promise<void>;
}
export declare class DisabledRawEventPublisher implements RawEventPublisher {
    get enabled(): boolean;
    publishRaw(topic: string, _value: string, _key?: string, _headers?: Readonly<Record<string, string>>): Promise<void>;
    shutdown(): Promise<void>;
}
