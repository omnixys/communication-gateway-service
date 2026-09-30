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

import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { getLogger } from '@omnixys/logger-ts';

import { AppModule } from './app.module.js';
import {
  assertProductionReadiness,
  loadConfig,
} from './config/configuration.js';

const logger = getLogger('Bootstrap', 'class');

/** Starts the gateway HTTP server. */
export async function bootstrap(): Promise<NestFastifyApplication> {
  const config = loadConfig(process.env);
  assertProductionReadiness(config);

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule.forRoot(),
    new FastifyAdapter(adapterOptions()),
    {
      // Provider webhooks are verified against the exact bytes that were
      // signed, so the unparsed body has to stay reachable on the request.
      rawBody: true,
      bufferLogs: false,
    },
  );

  app.enableShutdownHooks();
  await app.listen({ host: config.core.host, port: config.core.port });

  logger.info(
    {
      service: config.core.serviceName,
      host: config.core.host,
      port: config.core.port,
      environment: config.core.environment,
      graphql: '/graphql',
      internalApiKeyConfigured: config.core.internalApiKey.length > 0,
      persistence: config.database.enabled ? 'prisma' : 'in-memory',
    },
    'communication gateway listening',
  );
  return app;
}

/**
 * Fastify adapter options.
 *
 * The built in request logger is disabled because every log line goes through
 * `@omnixys/logger-ts`, and the JSON body limit matches the largest provider
 * payload the gateway accepts.
 */
function adapterOptions(): {
  logger: false;
  trustProxy: boolean;
  bodyLimit: number;
} {
  return {
    logger: false,
    trustProxy: true,
    bodyLimit: 1_048_576,
  };
}

const isEntrypoint = process.argv[1]?.endsWith('main.js') === true;
if (isEntrypoint) {
  bootstrap().catch((error: unknown) => {
    logger.fatal(
      { error: error instanceof Error ? error.message : String(error) },
      'bootstrap failed',
    );
    process.exitCode = 1;
  });
}
