/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import {
  Global,
  Inject,
  Injectable,
  Module,
  type DynamicModule,
  type OnApplicationShutdown,
  type OnModuleInit,
} from '@nestjs/common';
import { KafkaProducerService } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';

import type { MessageMappingStore } from '../../application/ports/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../../application/ports/outbound-event-publisher.port.js';
import type { RawEventPublisher } from '../../application/ports/raw-event-publisher.port.js';
import { APP_CONFIG } from '../../config/config.module.js';
import type { AppConfig } from '../../config/config.types.js';
import { AnalyticsOutboxWorker } from '../analytics/analytics-outbox.worker.js';
import { HttpEventForwarder } from '../events/http-event.forwarder.js';
import { InMemoryEventPublisher } from '../events/in-memory-event.publisher.js';
import { KafkaDeliveryEventHandler } from '../events/kafka-delivery-event.handler.js';
import {
  DisabledRawEventPublisher,
  KafkaRawEventPublisher,
} from '../events/kafka-raw-event.publisher.js';
import { MESSAGE_MAPPING_STORE } from '../persistence/persistence.module.js';
import { PrismaService } from '../persistence/prisma.service.js';

const logger = getLogger('EventLifecycle', 'class');

export const EVENT_PUBLISHER = Symbol('EVENT_PUBLISHER');
export const EVENT_FORWARDER = Symbol('EVENT_FORWARDER');
export const KAFKA_DELIVERY_HANDLER = Symbol('KAFKA_DELIVERY_HANDLER');
export const ANALYTICS_OUTBOX_WORKER = Symbol('ANALYTICS_OUTBOX_WORKER');
export const RAW_EVENT_PUBLISHER = Symbol('RAW_EVENT_PUBLISHER');

/**
 * Starts and stops every background consumer.
 *
 * The hooks run before the HTTP server accepts traffic, so the readiness probe
 * can trust the reported state of the forwarder.
 */
@Injectable()
export class EventLifecycle implements OnModuleInit, OnApplicationShutdown {
  constructor(
    @Inject(EVENT_FORWARDER) private readonly forwarder: HttpEventForwarder,
    @Inject(KAFKA_DELIVERY_HANDLER)
    private readonly deliveryHandler: KafkaDeliveryEventHandler,
    @Inject(ANALYTICS_OUTBOX_WORKER)
    private readonly outboxWorker: AnalyticsOutboxWorker,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.forwarder.start();
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'event_forwarder_start_failed',
      );
    }
    try {
      await this.deliveryHandler.start();
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'kafka_handler_start_failed',
      );
    }
    await this.outboxWorker.start();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.forwarder.stop();
    await this.deliveryHandler.stop();
    await this.outboxWorker.stop();
  }
}

/** Options of {@link EventsModule.forRoot}. */
export interface EventsModuleOptions {
  /** Whether `KafkaModule` is loaded and a producer is available. */
  readonly withKafka: boolean;
}

/**
 * Wires the event bus, the HTTP forwarder and the analytics outbox.
 *
 * Kafka is optional in this service, so the raw publisher is a disabled
 * no-op when no broker is configured.
 */
@Global()
@Module({})
export class EventsModule {
  static forRoot(options: EventsModuleOptions): DynamicModule {
    return {
      module: EventsModule,
      providers: [
        {
          provide: EVENT_PUBLISHER,
          useFactory: (): OutboundEventPublisher => new InMemoryEventPublisher(),
        },
        ...(options.withKafka
          ? [
              {
                provide: RAW_EVENT_PUBLISHER,
                inject: [KafkaProducerService],
                useFactory: (producer: KafkaProducerService): RawEventPublisher =>
                  new KafkaRawEventPublisher(producer),
              },
            ]
          : [
              {
                provide: RAW_EVENT_PUBLISHER,
                useFactory: (): RawEventPublisher => new DisabledRawEventPublisher(),
              },
            ]),
        {
          provide: EVENT_FORWARDER,
          inject: [EVENT_PUBLISHER, APP_CONFIG, MESSAGE_MAPPING_STORE],
          useFactory: (
            publisher: OutboundEventPublisher,
            config: AppConfig,
            mappingStore: MessageMappingStore,
          ): HttpEventForwarder =>
            new HttpEventForwarder(
              publisher,
              {
                chatServiceUrl: config.core.chatServiceUrl,
                chatServiceApiKey: config.core.chatServiceApiKey,
                notificationServiceUrl: config.core.notificationServiceUrl,
                notificationServiceApiKey: config.core.notificationServiceApiKey,
              },
              mappingStore,
              config.forwarder,
              config.whatsappSupport.eventMap,
            ),
        },
        {
          provide: KAFKA_DELIVERY_HANDLER,
          inject: [EVENT_PUBLISHER, RAW_EVENT_PUBLISHER, MESSAGE_MAPPING_STORE],
          useFactory: (
            publisher: OutboundEventPublisher,
            rawPublisher: RawEventPublisher,
            mappingStore: MessageMappingStore,
          ): KafkaDeliveryEventHandler =>
            new KafkaDeliveryEventHandler(publisher, rawPublisher, mappingStore),
        },
        {
          provide: ANALYTICS_OUTBOX_WORKER,
          inject: [PrismaService, RAW_EVENT_PUBLISHER],
          useFactory: (
            prisma: PrismaService,
            rawPublisher: RawEventPublisher,
          ): AnalyticsOutboxWorker => new AnalyticsOutboxWorker(prisma.maybeClient, rawPublisher),
        },
        EventLifecycle,
      ],
      exports: [EVENT_PUBLISHER, EVENT_FORWARDER, KAFKA_DELIVERY_HANDLER, RAW_EVENT_PUBLISHER],
    };
  }
}
