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
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * General Public License for more details.
 */

import { AppModule } from './app.module.js';
import {
  assertProductionReadiness,
  loadConfig,
} from './config/configuration.js';
import { corsOptions } from './config/cors.js';
import compress from '@fastify/compress';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { getLogger } from '@omnixys/logger-ts';
import { registerFastifyTracing } from '@omnixys/observability-ts';
import 'reflect-metadata';

const logger = getLogger('Bootstrap', 'class');

/** Starts the gateway only after configuration and database checks pass. */
export async function bootstrap(): Promise<NestFastifyApplication> {
  const config = loadConfig(process.env);
  assertProductionReadiness(config);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(),
    new FastifyAdapter({
      logger: false,
      trustProxy: true,
      bodyLimit: 1_048_576,
    }),
    { rawBody: true, bufferLogs: false },
  );
  const fastify = app.getHttpAdapter().getInstance();
  registerFastifyTracing(fastify);

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, corsOptions);
  await app.register(compress, {
    global: true,
    encodings: ['br', 'gzip', 'deflate'],
    threshold: 1024,
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
    allowList: (request) => request.url.startsWith('/health'),
  });

  app.enableShutdownHooks();
  await app.listen({ host: config.core.host, port: config.core.port });
  logger.info(
    {
      service: config.core.serviceName,
      host: config.core.host,
      port: config.core.port,
    },
    'communication_gateway_listening',
  );
  return app;
}

if (process.argv[1]?.endsWith('main.js')) {
  bootstrap().catch((error: unknown) => {
    logger.fatal(
      { error: error instanceof Error ? error.message : String(error) },
      'bootstrap_failed',
    );
    process.exitCode = 1;
  });
}
