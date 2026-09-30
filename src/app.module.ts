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

import { EventsModule } from './adapter/events/events.module.js';
import { CommunicationGatewayModule } from './communication-gateway/communication-gateway.module.js';
import { AppConfigModule } from './config/config.module.js';
import { loadConfig } from './config/configuration.js';
import { GatewayExceptionFilter } from './core/filters/gateway-exception.filter.js';
import { RequestContextMiddleware } from './core/middleware/request-context.middleware.js';
import { HealthModule } from './health/health.module.js';
import { PersistenceModule } from './prisma/persistence.module.js';
import { SecurityModule } from './security/security.module.js';
import { ApolloFederationDriver, type ApolloDriverConfig } from '@nestjs/apollo';
import {
  Module,
  ValidationPipe,
  type DynamicModule,
  type MiddlewareConsumer,
  type NestModule,
  type Type,
} from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { KafkaModule } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';

const logger = getLogger('AppModule', 'class');

/** Composition root: infrastructure first, then the gateway context and transports. */
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
        driver: ApolloFederationDriver,
        autoSchemaFile: { federation: { version: 2 } },
        sortSchema: true,
        playground: false,
        introspection: true,
      }),
      SecurityModule,
      CommunicationGatewayModule,
      HealthModule,
    ];
    if (withKafka) {
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
      providers: [
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
    };
  }

  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
