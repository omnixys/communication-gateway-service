var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var EventsModule_1;
import { Global, Inject, Injectable, Module, } from '@nestjs/common';
import { KafkaProducerService } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';
import { AnalyticsOutboxWorker } from '../../analytics/analytics-outbox.worker.js';
import { env } from '../../config/env.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MESSAGE_MAPPING_STORE } from '../../prisma/tokens.js';
import { HttpEventForwarder } from './http-event.forwarder.js';
import { InMemoryEventPublisher } from './in-memory-event.publisher.js';
import { KafkaDeliveryEventHandler } from './kafka-delivery-event.handler.js';
import { DisabledRawEventPublisher, KafkaRawEventPublisher } from './kafka-raw-event.publisher.js';
const logger = getLogger('EventLifecycle', 'class');
export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
export const EVENT_FORWARDER = Symbol('EVENT_FORWARDER');
export const KAFKA_DELIVERY_HANDLER = Symbol('KAFKA_DELIVERY_HANDLER');
export const ANALYTICS_OUTBOX_WORKER = Symbol('ANALYTICS_OUTBOX_WORKER');
export const RAW_EVENT_PUBLISHER = Symbol('RAW_EVENT_PUBLISHER');
let EventLifecycle = class EventLifecycle {
    forwarder;
    deliveryHandler;
    outboxWorker;
    constructor(forwarder, deliveryHandler, outboxWorker) {
        this.forwarder = forwarder;
        this.deliveryHandler = deliveryHandler;
        this.outboxWorker = outboxWorker;
    }
    async onModuleInit() {
        try {
            await this.forwarder.start();
        }
        catch (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'event_forwarder_start_failed');
        }
        try {
            await this.deliveryHandler.start();
        }
        catch (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'kafka_handler_start_failed');
        }
        await this.outboxWorker.start();
    }
    async onApplicationShutdown() {
        await this.forwarder.stop();
        await this.deliveryHandler.stop();
        await this.outboxWorker.stop();
    }
};
EventLifecycle = __decorate([
    Injectable(),
    __param(0, Inject(EVENT_FORWARDER)),
    __param(1, Inject(KAFKA_DELIVERY_HANDLER)),
    __param(2, Inject(ANALYTICS_OUTBOX_WORKER)),
    __metadata("design:paramtypes", [HttpEventForwarder,
        KafkaDeliveryEventHandler,
        AnalyticsOutboxWorker])
], EventLifecycle);
export { EventLifecycle };
let EventsModule = EventsModule_1 = class EventsModule {
    static forRoot(options) {
        return {
            module: EventsModule_1,
            providers: [
                {
                    provide: EVENT_PUBLISHER,
                    useFactory: () => new InMemoryEventPublisher(),
                },
                ...(options.withKafka
                    ? [
                        {
                            provide: RAW_EVENT_PUBLISHER,
                            inject: [KafkaProducerService],
                            useFactory: (producer) => new KafkaRawEventPublisher(producer),
                        },
                    ]
                    : [
                        {
                            provide: RAW_EVENT_PUBLISHER,
                            useFactory: () => new DisabledRawEventPublisher(),
                        },
                    ]),
                {
                    provide: EVENT_FORWARDER,
                    inject: [EVENT_PUBLISHER, MESSAGE_MAPPING_STORE],
                    useFactory: (publisher, mappingStore) => new HttpEventForwarder(publisher, {
                        chatServiceUrl: env.CHAT_SERVICE_URL,
                        chatServiceApiKey: env.CHAT_SERVICE_API_KEY,
                        notificationServiceUrl: env.NOTIFICATION_SERVICE_URL,
                        notificationServiceApiKey: env.NOTIFICATION_SERVICE_API_KEY,
                    }, mappingStore, {
                        maxAttempts: env.FORWARDER_MAX_ATTEMPTS,
                        baseDelayMs: env.FORWARDER_BASE_DELAY_MS,
                        maxDelayMs: env.FORWARDER_MAX_DELAY_MS,
                        timeoutMs: env.FORWARDER_TIMEOUT_MS,
                    }, env.WHATSAPP_SUPPORT_EVENT_MAP),
                },
                {
                    provide: KAFKA_DELIVERY_HANDLER,
                    inject: [EVENT_PUBLISHER, RAW_EVENT_PUBLISHER, MESSAGE_MAPPING_STORE],
                    useFactory: (publisher, rawPublisher, mappingStore) => new KafkaDeliveryEventHandler(publisher, rawPublisher, mappingStore),
                },
                {
                    provide: ANALYTICS_OUTBOX_WORKER,
                    inject: [PrismaService, RAW_EVENT_PUBLISHER],
                    useFactory: (prisma, rawPublisher) => new AnalyticsOutboxWorker(prisma, rawPublisher),
                },
                EventLifecycle,
            ],
            exports: [EVENT_PUBLISHER, EVENT_FORWARDER, KAFKA_DELIVERY_HANDLER, RAW_EVENT_PUBLISHER],
        };
    }
};
EventsModule = EventsModule_1 = __decorate([
    Global(),
    Module({})
], EventsModule);
export { EventsModule };
