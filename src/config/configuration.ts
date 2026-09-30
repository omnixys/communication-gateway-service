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

import { ConfigurationError } from '../domain/errors.js';
import type {
  AddressMapping,
  AppConfig,
  EmailProviderName,
  LogLevel,
  StalwartAuthMode,
  WhatsappSupportRoute,
} from './config.types.js';
import { normalizeDatabaseUrl } from './database-url.js';

const LOG_LEVELS: readonly LogLevel[] = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
  'test',
];

const EMAIL_PROVIDERS: readonly EmailProviderName[] = [
  'resend',
  'stalwart',
  'none',
];

const STALWART_AUTH_MODES: readonly StalwartAuthMode[] = [
  'password',
  'oauthbearer',
];

const PRODUCTION_ENVIRONMENTS: readonly string[] = [
  'production',
  'development',
  'staging',
];

/** Shortest internal api key accepted in a deployed environment. */
const MIN_INTERNAL_API_KEY_LENGTH = 16;

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class EnvReader {
  private readonly issues: string[] = [];

  constructor(private readonly env: NodeJS.ProcessEnv) {}

  string(key: string, fallback = ''): string {
    const raw = this.env[key];
    if (raw === undefined || raw.trim().length === 0) {
      return fallback;
    }
    return raw.trim();
  }

  integer(key: string, fallback: number): number {
    const raw = this.string(key);
    if (raw.length === 0) {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isInteger(parsed)) {
      this.issues.push(`${key} must be an integer, received "${raw}"`);
      return fallback;
    }
    return parsed;
  }

  /**
   * Integer that must be greater than zero.
   *
   * Retry budgets, timeouts and pool sizes below zero, or a zero retry
   * budget, produce a component that silently never retries or never
   * answers. Rejecting the value at startup is the only way to notice.
   */
  positiveInteger(key: string, fallback: number): number {
    const parsed = this.integer(key, fallback);
    if (parsed <= 0) {
      this.issues.push(
        `${key} must be greater than 0, received "${String(parsed)}"`,
      );
      return fallback;
    }
    return parsed;
  }

  number(key: string, fallback: number): number {
    const raw = this.string(key);
    if (raw.length === 0) {
      return fallback;
    }
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) {
      this.issues.push(`${key} must be a number, received "${raw}"`);
      return fallback;
    }
    return parsed;
  }

  boolean(key: string, fallback: boolean): boolean {
    const raw = this.string(key);
    if (raw.length === 0) {
      return fallback;
    }
    const normalized = raw.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
    this.issues.push(`${key} must be a boolean, received "${raw}"`);
    return fallback;
  }

  enumeration<T extends string>(
    key: string,
    allowed: readonly T[],
    fallback: T,
  ): T {
    const raw = this.string(key);
    if (raw.length === 0) {
      return fallback;
    }
    const normalized = raw.toLowerCase() as T;
    if (!allowed.includes(normalized)) {
      this.issues.push(
        `${key} must be one of ${allowed.join(', ')}, received "${raw}"`,
      );
      return fallback;
    }
    return normalized;
  }

  json<T>(key: string, fallback: T, validate?: (value: T) => string | null): T {
    const raw = this.string(key);
    if (raw.length === 0) {
      return fallback;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      this.issues.push(`${key} must be valid JSON`);
      return fallback;
    }
    if (validate) {
      const problem = validate(parsed as T);
      if (problem !== null) {
        this.issues.push(`${key} ${problem}`);
        return fallback;
      }
    }
    return parsed as T;
  }

  collect(): readonly string[] {
    return this.issues;
  }
}

function validateAddressMappings(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'must be a JSON object of user id to channel addresses';
  }
  for (const [userId, channels] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (userId.length === 0) {
      return 'must not contain empty user ids';
    }
    if (
      typeof channels !== 'object' ||
      channels === null ||
      Array.isArray(channels)
    ) {
      return `entry for "${userId}" must be an object of channel to address`;
    }
    for (const [channel, address] of Object.entries(
      channels as Record<string, unknown>,
    )) {
      if (typeof address !== 'string' || address.length === 0) {
        return `entry for "${userId}.${channel}" must be a non-empty string`;
      }
    }
  }
  return null;
}

function validateWhatsappEventMap(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return 'must be a JSON object of instance name to route';
  }
  for (const [instance, route] of Object.entries(
    value as Record<string, unknown>,
  )) {
    if (instance.length === 0) {
      return 'must not contain empty instance names';
    }
    if (typeof route !== 'object' || route === null || Array.isArray(route)) {
      return `entry for "${instance}" must be an object`;
    }
    const candidate = route as Record<string, unknown>;
    for (const field of ['tenantId', 'eventId']) {
      const fieldValue = candidate[field];
      if (typeof fieldValue !== 'string' || fieldValue.length === 0) {
        return `entry for "${instance}" requires a non-empty ${field}`;
      }
      if (!UUID_V4_RE.test(fieldValue)) {
        return `entry for "${instance}.${field}" must be a UUID`;
      }
    }
  }
  return null;
}

/**
 * Builds the typed runtime configuration from environment variables.
 *
 * @throws {ConfigurationError} when a value cannot be parsed.
 */
export function loadConfig(env: NodeJS.ProcessEnv): AppConfig {
  const reader = new EnvReader(env);

  const environment = reader.string('ENVIRONMENT', 'local');
  const logLevel = reader.enumeration('LOG_LEVEL', LOG_LEVELS, 'info');
  const databaseUrl = normalizeDatabaseUrl(reader.string('DATABASE_URL'));

  const config: AppConfig = {
    core: {
      serviceName: reader.string('SERVICE_NAME', 'communication-gateway'),
      environment,
      isProduction: environment.toLowerCase() === 'production',
      host: reader.string('HOST', '0.0.0.0'),
      port: reader.integer('PORT', 8000),
      logLevel,
      hotReload: reader.boolean('HOT_RELOAD', false),
      internalApiKey: reader.string('INTERNAL_API_KEY'),
      chatServiceUrl: reader.string('CHAT_SERVICE_URL'),
      chatServiceApiKey: reader.string('CHAT_SERVICE_API_KEY'),
      notificationServiceUrl: reader.string('NOTIFICATION_SERVICE_URL'),
      notificationServiceApiKey: reader.string('NOTIFICATION_SERVICE_API_KEY'),
      addressMappings: reader.json<AddressMapping>(
        'ADDRESS_MAPPINGS',
        {},
        validateAddressMappings,
      ),
    },
    database: {
      url: databaseUrl,
      enabled: databaseUrl.length > 0,
      echo: reader.boolean('DATABASE_ECHO', false),
      poolSize: reader.positiveInteger('DATABASE_POOL_SIZE', 10),
      maxOverflow: reader.positiveInteger('DATABASE_MAX_OVERFLOW', 20),
    },
    keycloak: {
      url: reader.string('KEYCLOAK_URL'),
      realm: reader.string('KEYCLOAK_REALM', 'omnixys'),
      audience: reader.string('KEYCLOAK_AUDIENCE', 'account'),
      clientId: reader.string('KEYCLOAK_CLIENT_ID'),
      clientSecret: reader.string('KEYCLOAK_CLIENT_SECRET'),
    },
    evolution: {
      baseUrl: reader.string('EVOLUTION_BASE_URL'),
      apiKey: reader.string('EVOLUTION_API_KEY'),
      instanceName: reader.string('EVOLUTION_INSTANCE_NAME', 'omnixys'),
      webhookSecret: reader.string('EVOLUTION_WEBHOOK_SECRET'),
    },
    whatsappSupport: {
      eventMap: reader.json<Readonly<Record<string, WhatsappSupportRoute>>>(
        'WHATSAPP_SUPPORT_EVENT_MAP',
        {},
        validateWhatsappEventMap,
      ),
    },
    resend: {
      apiKey: reader.string('RESEND_API_KEY'),
      fromAddress: reader.string('RESEND_FROM_ADDRESS'),
      baseUrl: reader.string('RESEND_BASE_URL', 'https://api.resend.com'),
      timeout: reader.positiveInteger('RESEND_TIMEOUT', 30),
    },
    stalwart: {
      enabled: reader.boolean('STALWART_ENABLED', false),
      priority: reader.integer('STALWART_PRIORITY', 10),
      timeout: reader.positiveInteger('STALWART_TIMEOUT', 30),
      host: reader.string('STALWART_HOST'),
      port: reader.integer('STALWART_PORT', 587),
      username: reader.string('STALWART_USERNAME'),
      password: reader.string('STALWART_PASSWORD'),
      authMode: reader.enumeration(
        'STALWART_AUTH_MODE',
        STALWART_AUTH_MODES,
        'password',
      ),
      oauthTokenUrl: reader.string('STALWART_OAUTH_TOKEN_URL'),
      oauthClientId: reader.string('STALWART_OAUTH_CLIENT_ID'),
      oauthClientSecret: reader.string('STALWART_OAUTH_CLIENT_SECRET'),
      fromAddress: reader.string('STALWART_FROM_ADDRESS'),
      tlsEnabled: reader.boolean('STALWART_TLS_ENABLED', true),
      tlsVerify: reader.boolean('STALWART_TLS_VERIFY', true),
    },
    kafka: {
      broker: reader.string('KAFKA_BROKER'),
      acks: reader.string('KAFKA_ACKS', 'all'),
      retries: reader.integer('KAFKA_RETRIES', 3),
      topicDeliveryStatus: reader.string(
        'KAFKA_TOPIC_DELIVERY_STATUS',
        'gateway.delivery.status',
      ),
    },
    observability: {
      tempoHealthUrl: reader.string('OTEL_TEMPO_HEALTH_URL'),
      prometheusHealthUrl: reader.string('OTEL_PROMETHEUS_HEALTH_URL'),
      tracingEnabled: reader.boolean('OTEL_TRACING_ENABLED', true),
      samplingProbability: reader.number('OTEL_SAMPLING_PROBABILITY', 0.1),
    },
    forwarder: {
      maxAttempts: reader.positiveInteger('FORWARDER_MAX_ATTEMPTS', 3),
      baseDelayMs: reader.positiveInteger('FORWARDER_BASE_DELAY_MS', 200),
      maxDelayMs: reader.positiveInteger('FORWARDER_MAX_DELAY_MS', 2000),
      timeoutMs: reader.positiveInteger('FORWARDER_TIMEOUT_MS', 15000),
    },
    cache: {
      url: reader.string('CACHE_URL'),
      keyPrefix: reader.string('CACHE_KEY_PREFIX', 'communication-gateway'),
    },
    emailPrimary: reader.enumeration(
      'EMAIL_PRIMARY',
      EMAIL_PROVIDERS,
      'resend',
    ),
    emailFallback: reader.enumeration(
      'EMAIL_FALLBACK',
      EMAIL_PROVIDERS,
      'none',
    ),
  };

  const issues = reader.collect();
  if (issues.length > 0) {
    throw new ConfigurationError('Invalid environment configuration', issues);
  }

  assertProductionReadiness(config);

  return config;
}

/**
 * Fails fast when a deployed environment is missing a required setting.
 *
 * Local development keeps working with an empty configuration; deployed
 * environments must be complete.
 */
export function assertProductionReadiness(config: AppConfig): void {
  if (config.core.logLevel === 'test') {
    return;
  }
  if (!config.core.environment) {
    throw new ConfigurationError('Missing required env: ENVIRONMENT');
  }
  if (
    !PRODUCTION_ENVIRONMENTS.includes(config.core.environment.toLowerCase())
  ) {
    return;
  }

  const required: Record<string, string> = {
    CHAT_SERVICE_URL: config.core.chatServiceUrl,
    NOTIFICATION_SERVICE_URL: config.core.notificationServiceUrl,
    INTERNAL_API_KEY: config.core.internalApiKey,
    CHAT_SERVICE_API_KEY: config.core.chatServiceApiKey,
    NOTIFICATION_SERVICE_API_KEY: config.core.notificationServiceApiKey,
    EVOLUTION_BASE_URL: config.evolution.baseUrl,
    EVOLUTION_API_KEY: config.evolution.apiKey,
    EVOLUTION_WEBHOOK_SECRET: config.evolution.webhookSecret,
  };

  if (config.emailPrimary === 'resend' || config.emailFallback === 'resend') {
    required['RESEND_API_KEY'] = config.resend.apiKey;
    required['RESEND_FROM_ADDRESS'] = config.resend.fromAddress;
  }

  if (
    config.emailPrimary === 'stalwart' ||
    config.emailFallback === 'stalwart'
  ) {
    required['STALWART_HOST'] = config.stalwart.host;
    required['STALWART_USERNAME'] = config.stalwart.username;
    required['STALWART_PASSWORD'] = config.stalwart.password;
    if (config.stalwart.authMode === 'oauthbearer') {
      required['STALWART_OAUTH_TOKEN_URL'] = config.stalwart.oauthTokenUrl;
      required['STALWART_OAUTH_CLIENT_ID'] = config.stalwart.oauthClientId;
      required['STALWART_OAUTH_CLIENT_SECRET'] =
        config.stalwart.oauthClientSecret;
    }
  }

  if (config.database.enabled) {
    required['DATABASE_URL'] = config.database.url;
  }

  const missing = Object.entries(required)
    .filter(([, value]) => value.length === 0)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new ConfigurationError(
      'Missing required production settings',
      missing,
    );
  }

  if (config.core.port < 1 || config.core.port > 65535) {
    throw new ConfigurationError('PORT must be a valid TCP port', [
      `received ${String(config.core.port)}`,
    ]);
  }

  // A deployed gateway authenticates every internal call with this value, so a
  // guessable key would leave the REST surface, GraphQL and the webhooks open.
  if (config.core.internalApiKey.length < MIN_INTERNAL_API_KEY_LENGTH) {
    throw new ConfigurationError(
      `INTERNAL_API_KEY must be at least ${String(MIN_INTERNAL_API_KEY_LENGTH)} characters`,
      [`received ${String(config.core.internalApiKey.length)} characters`],
    );
  }
}
