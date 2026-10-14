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

/**
 * Test environment isolation.
 *
 * `node --env-file` does not override variables that are already present in
 * the process environment, so a developer or CI runner that exports
 * `DATABASE_URL` or `KAFKA_BROKER` would silently point the suite at real
 * infrastructure. This module is imported first by every test file, before
 * any application module, and forces the values that must never be taken from
 * the ambient environment.
 *
 * ESM evaluates imported modules in declaration order, so the assignment below
 * runs before the application modules of the importing file are evaluated.
 */

/** Closed local port: a connection is refused immediately. */
const CLOSED_PORT_URL =
  'postgresql://omnixys:omnixys@127.0.0.1:1/omnixys_test?connect_timeout=1';

const FORCED = {
  NODE_ENV: 'test',
  DOTENV_CONFIG_PATH: '/dev/null',
  ENVIRONMENT: 'local',
  LOG_LEVEL: 'silent',
  PORT: '0',
  // Non-empty, so the generated Prisma client keeps this value and does not
  // load the repository .env. The port is closed, so no test can reach a
  // database even if a query is issued.
  DATABASE_URL: CLOSED_PORT_URL,
  KAFKA_BROKER: '',
  KAFKA_CLIENT_ID: 'communication-gateway-test',
  KAFKA_CONSUMER_GROUP: 'communication-gateway-test',
  INTERNAL_API_KEY: 'test-internal-api-key',
  CHAT_SERVICE_URL: 'http://127.0.0.1:9',
  CHAT_SERVICE_API_KEY: 'test-chat-key',
  NOTIFICATION_SERVICE_URL: 'http://127.0.0.1:9',
  NOTIFICATION_SERVICE_API_KEY: 'test-notification-key',
  EVOLUTION_BASE_URL: 'http://127.0.0.1:9',
  EVOLUTION_API_KEY: 'test-evolution-key',
  EVOLUTION_INSTANCE_NAME: 'communication-gateway-test',
  RESEND_API_KEY: '',
  EMAIL_PRIMARY: 'none',
  STALWART_HOST: '127.0.0.1',
  STALWART_PORT: '9',
  STALWART_USERNAME: 'test',
  STALWART_PASSWORD: 'test',
  // The optional file based test env must never win over the values above.
  CACHE_DRIVER: 'memory',
};

for (const [key, value] of Object.entries(FORCED)) {
  process.env[key] = value;
}

export const TEST_ENV = Object.freeze({ ...FORCED });
export const INTERNAL_API_KEY = FORCED.INTERNAL_API_KEY;
export const API_KEY_HEADER = 'x-internal-api-key';
