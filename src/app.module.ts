/** Composition root, following the static module layout of the TypeScript services. */
import { EventsModule } from './adapter/events/events.module.js';
import { CommunicationGatewayModule } from './communication-gateway/communication-gateway.module.js';
import { GatewayExceptionFilter } from './communication-gateway/filters/gateway-exception.filter.js';
import { BannerService } from './config/banner.service.js';
import { env } from './config/env.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SecurityModule } from './security/security.module.js';
import { Module, ValidationPipe } from '@nestjs/common';
import { APP_FILTER, APP_PIPE } from '@nestjs/core';
import { ContextModule } from '@omnixys/context-ts';
import { OmnixysGraphQLModule } from '@omnixys/graphql-ts';
import { KafkaModule } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';

const withKafka = env.KAFKA_BROKER.length > 0;
const logger = getLogger('AppModule', 'class');
if (!withKafka) {
  logger.warn('kafka_disabled: KAFKA_BROKER is empty, cross service events are dropped');
}

@Module({
  imports: [
    ContextModule.forRoot({ global: true, tenantHeader: 'x-tenant-id' }),
    PrismaModule,
    ...(withKafka
      ? [
          KafkaModule.forRoot({
            clientId: `${env.SERVICE}-producer`,
            groupId: `${env.SERVICE}-delivery`,
            serviceName: env.SERVICE,
            brokers: [env.KAFKA_BROKER],
            fromBeginning: false,
            retry: { maxRetries: env.KAFKA_RETRIES },
          }),
        ]
      : []),
    EventsModule.forRoot({ withKafka }),
    OmnixysGraphQLModule.forRoot({
      autoSchemaFile: { federation: { version: 2 } },
      sortSchema: true,
      playground: false,
      introspection: true,
    }),
    SecurityModule,
    CommunicationGatewayModule,
    HealthModule,
  ],
  providers: [
    BannerService,
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
})
export class AppModule {}
