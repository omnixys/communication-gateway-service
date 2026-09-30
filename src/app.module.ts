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

import { ApolloDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import {
  Module,
  ValidationPipe,
  type DynamicModule,
  type MiddlewareConsumer,
  type NestModule,
  type Type,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { KafkaModule } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';

import { InternalApiKeyGuard } from './api/auth/internal-api-key.guard.js';
import { GatewayExceptionFilter } from './api/filters/gateway-exception.filter.js';
import { ProvidersResolver } from './api/graphql/providers.resolver.js';
import { HealthController } from './api/health/health.controller.js';
import { MessagesController } from './api/messages/messages.controller.js';
import { MessagesService } from './api/messages/messages.service.js';
import { RequestContextMiddleware } from './api/middleware/request-context.middleware.js';
import { ProvidersController } from './api/providers/providers.controller.js';
import {
  ADDRESS_RESOLVER,
  CHANNEL_PROVIDER_REGISTRY,
  WEBHOOK_SERVICE,
} from './api/shared/tokens.js';
import { WebhooksController } from './api/webhooks/webhooks.controller.js';
import type { MessageMappingStore } from './application/ports/message-mapping-store.port.js';
import type { OutboundEventPublisher } from './application/ports/outbound-event-publisher.port.js';
import { GatewayDispatcher } from './application/services/gateway-dispatcher.service.js';
import { WebhookService } from './application/services/webhook.service.js';
import { AppConfigModule, APP_CONFIG } from './config/config.module.js';
import type { AppConfig } from './config/config.types.js';
import { loadConfig } from './config/configuration.js';
import { EVENT_PUBLISHER, EventsModule } from './infrastructure/events/events.module.js';
import {
  MESSAGE_MAPPING_STORE,
  PersistenceModule,
} from './infrastructure/persistence/persistence.module.js';
import { ProviderLifecycle } from './infrastructure/providers/provider-lifecycle.service.js';
import { buildChannelRegistry } from './infrastructure/providers/provider-registry.factory.js';
import type { InMemoryChannelProviderRegistry } from './infrastructure/registry/in-memory-channel-provider.registry.js';
import { DictAddressResolver } from './infrastructure/resolvers/dict-address.resolver.js';

const logger = getLogger('AppModule', 'class');

/**
 * Composition root.
 *
 * Kafka is optional in this service, so the module graph is assembled from the
 * validated configuration at bootstrap instead of being a static decorator
 * list. The configuration is read twice on purpose: once here to decide which
 * modules exist, and once inside `AppConfigModule` to expose the typed object
 * to the providers.
 */
@Module({})
export class AppModule implements NestModule {
  static forRoot(): DynamicModule {
    const config = loadConfig(process.env);
    const withKafka = config.kafka.broker.length > 0;
    const imports: Array<Type<unknown> | DynamicModule> = [
      AppConfigModule,
      PersistenceModule,
      EventsModule.forRoot({ withKafka }),
      GraphQLModule.forRoot<ApolloDriverConfig>({
        driver: ApolloDriver,
        autoSchemaFile: true,
        sortSchema: true,
        playground: false,
        introspection: true,
      }),
    ];

    if (withKafka) {
      logger.info({ broker: config.kafka.broker }, 'kafka_enabled');
      imports.unshift(
        KafkaModule.forRoot({
          clientId: `${config.core.serviceName}-producer`,
          groupId: `${config.core.serviceName}-delivery`,
          serviceName: config.core.serviceName,
          brokers: [config.kafka.broker],
          fromBeginning: false,
          retry: { maxRetries: config.kafka.retries },
        }),
      );
    } else {
      logger.warn('kafka_disabled: KAFKA_BROKER is empty, cross service events are dropped');
    }

    return {
      module: AppModule,
      imports,
      controllers: [MessagesController, ProvidersController, HealthController, WebhooksController],
      providers: [
        {
          provide: CHANNEL_PROVIDER_REGISTRY,
          inject: [APP_CONFIG],
          useFactory: (appConfig: AppConfig): InMemoryChannelProviderRegistry =>
            buildChannelRegistry(appConfig),
        },
        {
          provide: ADDRESS_RESOLVER,
          inject: [APP_CONFIG],
          useFactory: (appConfig: AppConfig): DictAddressResolver =>
            new DictAddressResolver(appConfig.core.addressMappings),
        },
        {
          provide: GatewayDispatcher,
          inject: [CHANNEL_PROVIDER_REGISTRY],
          useFactory: (registry: InMemoryChannelProviderRegistry): GatewayDispatcher =>
            new GatewayDispatcher(registry),
        },
        {
          provide: WEBHOOK_SERVICE,
          inject: [CHANNEL_PROVIDER_REGISTRY, EVENT_PUBLISHER, MESSAGE_MAPPING_STORE],
          useFactory: (
            registry: InMemoryChannelProviderRegistry,
            publisher: OutboundEventPublisher,
            mappingStore: MessageMappingStore,
          ): WebhookService => new WebhookService(registry, publisher, mappingStore),
        },
        MessagesService,
        ProvidersResolver,
        ProviderLifecycle,
        {
          provide: APP_GUARD,
          useClass: InternalApiKeyGuard,
        },
        {
          provide: APP_PIPE,
          useFactory: (): ValidationPipe =>
            new ValidationPipe({
              transform: true,
              whitelist: true,
              forbidNonWhitelisted: true,
              validationError: { target: false, value: false },
            }),
        },
        { provide: APP_FILTER, useClass: GatewayExceptionFilter },
      ],
      exports: [],
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
