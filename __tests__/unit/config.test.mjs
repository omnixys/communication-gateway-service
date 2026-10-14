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

import { readEnv } from '../../dist/config/env.js';

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

describe('readEnv', () => {
  it('keeps Kafka optional while requiring persistence', () => {
    const config = readEnv(BASE_ENV);

    assert.equal(Boolean(config.DATABASE_URL), true);
    assert.equal(config.DATABASE_URL, BASE_ENV.DATABASE_URL);
    assert.equal(config.KAFKA_BROKER, '');
    assert.equal(config.PORT, 8000);
  });

  it('uses the user-service SERVICE and NODE_ENV names with legacy fallbacks', () => {
    const legacy = readEnv(BASE_ENV);
    assert.equal(legacy.SERVICE, 'communication-gateway');
    assert.equal(legacy.NODE_ENV, 'local');

    const current = readEnv({
      ...BASE_ENV,
      SERVICE: 'gateway',
      NODE_ENV: 'test',
    });
    assert.equal(current.SERVICE, 'gateway');
    assert.equal(current.NODE_ENV, 'test');
  });

  it('rejects a missing database url even in local mode', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, DATABASE_URL: '' }),
      /DATABASE_URL/,
    );
  });

  it('enables persistence and normalizes the url', () => {
    const config = readEnv({
      ...BASE_ENV,
      DATABASE_URL: 'postgresql+asyncpg://u:p@h:5432/db',
    });

    assert.equal(Boolean(config.DATABASE_URL), true);
    assert.equal(config.DATABASE_URL, 'postgresql://u:p@h:5432/db');
  });

  it('keeps the documented kafka topic and budgets', () => {
    const config = readEnv({ ...BASE_ENV, KAFKA_BROKER: 'kafka:9092' });

    assert.equal(config.KAFKA_BROKER, 'kafka:9092');
    assert.equal(config.KAFKA_TOPIC_DELIVERY_STATUS, 'gateway.delivery.status');
    assert.equal(config.KAFKA_RETRIES, 3);
  });

  it('defaults the forwarder budget to the values of the previous runtime', () => {
    const config = readEnv(BASE_ENV);

    assert.equal(config.FORWARDER_MAX_ATTEMPTS, 3);
    assert.equal(config.FORWARDER_BASE_DELAY_MS, 200);
    assert.equal(config.FORWARDER_MAX_DELAY_MS, 2000);
    assert.equal(config.FORWARDER_TIMEOUT_MS, 15000);
  });

  it('accepts a forwarder budget override', () => {
    const config = readEnv({
      ...BASE_ENV,
      FORWARDER_MAX_ATTEMPTS: '5',
      FORWARDER_BASE_DELAY_MS: '250',
    });

    assert.equal(config.FORWARDER_MAX_ATTEMPTS, 5);
    assert.equal(config.FORWARDER_BASE_DELAY_MS, 250);
  });

  it('rejects a retry budget that would never retry again', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, FORWARDER_MAX_ATTEMPTS: '0' }),
      /FORWARDER_MAX_ATTEMPTS must be greater than 0/u,
    );
  });

  it('rejects a negative retry budget', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, FORWARDER_MAX_ATTEMPTS: '-1' }),
      /FORWARDER_MAX_ATTEMPTS must be greater than 0/u,
    );
  });

  it('rejects a zero backoff that would hammer the chat service', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, FORWARDER_BASE_DELAY_MS: '0' }),
      /FORWARDER_BASE_DELAY_MS must be greater than 0/u,
    );
  });

  it('rejects a non numeric setting instead of silently defaulting it', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, STALWART_PORT: 'not-a-port' }),
      /STALWART_PORT must be an integer/u,
    );
  });

  it('rejects an unknown boolean instead of guessing', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, STALWART_ENABLED: 'perhaps' }),
      /STALWART_ENABLED must be a boolean/u,
    );
  });

  it('rejects an unknown email provider', () => {
    assert.throws(
      () => readEnv({ ...BASE_ENV, EMAIL_PRIMARY: 'sendgrid' }),
      /EMAIL_PRIMARY/u,
    );
  });

  it('rejects an address mapping that is not a uuid', () => {
    assert.throws(
      () =>
        readEnv({
          ...BASE_ENV,
          ADDRESS_MAPPINGS: JSON.stringify([
            { channel: 'WHATSAPP', address: '1' },
          ]),
        }),
      /ADDRESS_MAPPINGS/u,
    );
  });

  it('accepts a complete deployed configuration', () => {
    const config = readEnv(DEPLOYED_ENV);

    assert.equal(config.NODE_ENV, 'production');
    assert.equal(config.EMAIL_PRIMARY, 'none');
  });

  it('rejects a deployed run without an internal api key', () => {
    assert.throws(
      () => readEnv({ ...DEPLOYED_ENV, INTERNAL_API_KEY: '' }),
      /Missing required production settings/u,
    );
  });

  it('rejects a deployed run with a guessable internal api key', () => {
    assert.throws(
      () => readEnv({ ...DEPLOYED_ENV, INTERNAL_API_KEY: 'short' }),
      /INTERNAL_API_KEY must be at least 16 characters/u,
    );
  });

  it('rejects a deployed run without the chat service', () => {
    assert.throws(
      () => readEnv({ ...DEPLOYED_ENV, CHAT_SERVICE_URL: '' }),
      /Missing required production settings/u,
    );
  });

  it('rejects a deployed run that selects resend without credentials', () => {
    assert.throws(
      () =>
        readEnv({
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
        readEnv({
          ...DEPLOYED_ENV,
          EMAIL_PRIMARY: 'stalwart',
          STALWART_HOST: '',
        }),
      /Missing required production settings/u,
    );
  });

  it('rejects an out of range port in a deployed run', () => {
    assert.throws(
      () => readEnv({ ...DEPLOYED_ENV, PORT: '70000' }),
      /PORT must be a valid TCP port/u,
    );
  });

  it('keeps local development permissive about optional integrations', () => {
    const config = readEnv({
      ...BASE_ENV,
      CHAT_SERVICE_URL: '',
      NOTIFICATION_SERVICE_URL: '',
      INTERNAL_API_KEY: '',
    });

    assert.equal(config.CHAT_SERVICE_URL, '');
    assert.equal(config.INTERNAL_API_KEY, '');
  });
});
