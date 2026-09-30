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

import './../support/env.mjs';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig } from '../../dist/config/configuration.js';
import { normalizeDatabaseUrl } from '../../dist/config/database-url.js';

const BASE_ENV = {
  ENVIRONMENT: 'local',
  LOG_LEVEL: 'silent',
  PORT: '8000',
  DATABASE_URL: 'postgresql://u:p@127.0.0.1:1/db',
  KAFKA_BROKER: '',
  INTERNAL_API_KEY: 'unit-internal-key',
};

/** Everything a deployed environment must provide, on top of {@link BASE_ENV}. */
const DEPLOYED_ENV = {
  ...BASE_ENV,
  ENVIRONMENT: 'production',
  CHAT_SERVICE_URL: 'http://chat:7100',
  CHAT_SERVICE_API_KEY: 'chat-key',
  NOTIFICATION_SERVICE_URL: 'http://notification:7200',
  NOTIFICATION_SERVICE_API_KEY: 'notification-key',
  EVOLUTION_BASE_URL: 'http://evolution:8080',
  EVOLUTION_API_KEY: 'evolution-key',
  EVOLUTION_WEBHOOK_SECRET: 'evolution-webhook-secret',
  EMAIL_PRIMARY: 'none',
};

describe('normalizeDatabaseUrl', () => {
  it('rewrites the SQLAlchemy and psycopg schemes Prisma cannot parse', () => {
    assert.equal(
      normalizeDatabaseUrl('postgresql+asyncpg://u:p@h:5432/db'),
      'postgresql://u:p@h:5432/db',
    );
    assert.equal(
      normalizeDatabaseUrl('postgresql+psycopg://u:p@h:5432/db'),
      'postgresql://u:p@h:5432/db',
    );
    assert.equal(
      normalizeDatabaseUrl('postgres://u:p@h:5432/db'),
      'postgresql://u:p@h:5432/db',
    );
  });

  it('leaves a plain Prisma url untouched', () => {
    assert.equal(
      normalizeDatabaseUrl('postgresql://u:p@h:5432/db?schema=public'),
      'postgresql://u:p@h:5432/db?schema=public',
    );
  });

  it('keeps an empty value empty instead of inventing a host', () => {
    assert.equal(normalizeDatabaseUrl(''), '');
  });
});

describe('loadConfig', () => {
  it('keeps Kafka optional while requiring persistence', () => {
    const config = loadConfig(BASE_ENV);

    assert.equal(config.database.enabled, true);
    assert.equal(config.database.url, BASE_ENV.DATABASE_URL);
    assert.equal(config.kafka.broker, '');
    assert.equal(config.core.port, 8000);
  });

  it('rejects a missing database url even in local mode', () => {
    assert.throws(() => loadConfig({ ...BASE_ENV, DATABASE_URL: '' }), /DATABASE_URL/);
  });

  it('enables persistence and normalizes the url', () => {
    const config = loadConfig({
      ...BASE_ENV,
      DATABASE_URL: 'postgresql+asyncpg://u:p@h:5432/db',
    });

    assert.equal(config.database.enabled, true);
    assert.equal(config.database.url, 'postgresql://u:p@h:5432/db');
  });

  it('keeps the documented kafka topic and budgets', () => {
    const config = loadConfig({ ...BASE_ENV, KAFKA_BROKER: 'kafka:9092' });

    assert.equal(config.kafka.broker, 'kafka:9092');
    assert.equal(config.kafka.topicDeliveryStatus, 'gateway.delivery.status');
    assert.equal(config.kafka.retries, 3);
  });

  it('defaults the forwarder budget to the values of the previous runtime', () => {
    const config = loadConfig(BASE_ENV);

    assert.equal(config.forwarder.maxAttempts, 3);
    assert.equal(config.forwarder.baseDelayMs, 200);
    assert.equal(config.forwarder.maxDelayMs, 2000);
    assert.equal(config.forwarder.timeoutMs, 15000);
  });

  it('accepts a forwarder budget override', () => {
    const config = loadConfig({
      ...BASE_ENV,
      FORWARDER_MAX_ATTEMPTS: '5',
      FORWARDER_BASE_DELAY_MS: '250',
    });

    assert.equal(config.forwarder.maxAttempts, 5);
    assert.equal(config.forwarder.baseDelayMs, 250);
  });

  it('rejects a retry budget that would never retry again', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, FORWARDER_MAX_ATTEMPTS: '0' }),
      /FORWARDER_MAX_ATTEMPTS must be greater than 0/u,
    );
  });

  it('rejects a negative retry budget', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, FORWARDER_MAX_ATTEMPTS: '-1' }),
      /FORWARDER_MAX_ATTEMPTS must be greater than 0/u,
    );
  });

  it('rejects a zero backoff that would hammer the chat service', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, FORWARDER_BASE_DELAY_MS: '0' }),
      /FORWARDER_BASE_DELAY_MS must be greater than 0/u,
    );
  });

  it('rejects a non numeric setting instead of silently defaulting it', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, STALWART_PORT: 'not-a-port' }),
      /STALWART_PORT must be an integer/u,
    );
  });

  it('rejects an unknown boolean instead of guessing', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, DATABASE_ECHO: 'perhaps' }),
      /DATABASE_ECHO must be a boolean/u,
    );
  });

  it('rejects an unknown email provider', () => {
    assert.throws(
      () => loadConfig({ ...BASE_ENV, EMAIL_PRIMARY: 'sendgrid' }),
      /EMAIL_PRIMARY/u,
    );
  });

  it('rejects an address mapping that is not a uuid', () => {
    assert.throws(
      () =>
        loadConfig({
          ...BASE_ENV,
          ADDRESS_MAPPINGS: JSON.stringify([
            { channel: 'WHATSAPP', address: '1' },
          ]),
        }),
      /ADDRESS_MAPPINGS/u,
    );
  });

  it('accepts a complete deployed configuration', () => {
    const config = loadConfig(DEPLOYED_ENV);

    assert.equal(config.core.isProduction, true);
    assert.equal(config.emailPrimary, 'none');
  });

  it('rejects a deployed run without an internal api key', () => {
    assert.throws(
      () => loadConfig({ ...DEPLOYED_ENV, INTERNAL_API_KEY: '' }),
      /Missing required production settings/u,
    );
  });

  it('rejects a deployed run with a guessable internal api key', () => {
    assert.throws(
      () => loadConfig({ ...DEPLOYED_ENV, INTERNAL_API_KEY: 'short' }),
      /INTERNAL_API_KEY must be at least 16 characters/u,
    );
  });

  it('rejects a deployed run without the chat service', () => {
    assert.throws(
      () => loadConfig({ ...DEPLOYED_ENV, CHAT_SERVICE_URL: '' }),
      /Missing required production settings/u,
    );
  });

  it('rejects a deployed run that selects resend without credentials', () => {
    assert.throws(
      () =>
        loadConfig({
          ...DEPLOYED_ENV,
          EMAIL_PRIMARY: 'resend',
          RESEND_API_KEY: '',
        }),
      /Missing required production settings/u,
    );
  });

  it('rejects a deployed run that selects stalwart without credentials', () => {
    assert.throws(
      () =>
        loadConfig({
          ...DEPLOYED_ENV,
          EMAIL_PRIMARY: 'stalwart',
          STALWART_HOST: '',
        }),
      /Missing required production settings/u,
    );
  });

  it('rejects an out of range port in a deployed run', () => {
    assert.throws(
      () => loadConfig({ ...DEPLOYED_ENV, PORT: '70000' }),
      /PORT must be a valid TCP port/u,
    );
  });

  it('keeps local development permissive about optional integrations', () => {
    const config = loadConfig({
      ...BASE_ENV,
      CHAT_SERVICE_URL: '',
      NOTIFICATION_SERVICE_URL: '',
      INTERNAL_API_KEY: '',
    });

    assert.equal(config.core.chatServiceUrl, '');
    assert.equal(config.core.internalApiKey, '');
  });
});
