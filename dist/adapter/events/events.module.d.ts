import { type DynamicModule, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { AnalyticsOutboxWorker } from '../../analytics/analytics-outbox.worker.js';
import { HttpEventForwarder } from './http-event.forwarder.js';
import { KafkaDeliveryEventHandler } from './kafka-delivery-event.handler.js';
export declare const EVENT_PUBLISHER: unique symbol;
export declare const EVENT_FORWARDER: unique symbol;
export declare const KAFKA_DELIVERY_HANDLER: unique symbol;
export declare const ANALYTICS_OUTBOX_WORKER: unique symbol;
export declare const RAW_EVENT_PUBLISHER: unique symbol;
export declare class EventLifecycle implements OnModuleInit, OnApplicationShutdown {
    private readonly forwarder;
    private readonly deliveryHandler;
    private readonly outboxWorker;
    constructor(forwarder: HttpEventForwarder, deliveryHandler: KafkaDeliveryEventHandler, outboxWorker: AnalyticsOutboxWorker);
    onModuleInit(): Promise<void>;
    onApplicationShutdown(): Promise<void>;
}
export interface EventsModuleOptions {
    readonly withKafka: boolean;
}
export declare class EventsModule {
    static forRoot(options: EventsModuleOptions): DynamicModule;
}
