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
 * Runtime configuration contract for the Communication Gateway.
 *
 * The keys mirror the environment variables that the existing Compose and
 * Kubernetes deployments already provide, so no infrastructure change is
 * required for the Node runtime.
 */

/** Log levels accepted by the runtime. `test` silences the production checks. */
export type LogLevel =
  | 'trace'
  | 'debug'
  | 'info'
  | 'warn'
  | 'error'
  | 'fatal'
  | 'silent'
  | 'test';

/** SMTP authentication mechanism used by the Stalwart provider. */
export type StalwartAuthMode = 'password' | 'oauthbearer';

/** Email provider selection for the `EMAIL` channel. */
export type EmailProviderName = 'resend' | 'stalwart' | 'none';

/** Legacy recipient-id to channel-address mapping. */
export interface AddressMapping {
  readonly [userId: string]: Readonly<Record<string, string>>;
}

/** Deployment-time route for one Evolution instance. */
export interface WhatsappSupportRoute {
  readonly tenantId: string;
  readonly eventId: string;
}

export interface CoreConfig {
  readonly serviceName: string;
  readonly environment: string;
  readonly isProduction: boolean;
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly hotReload: boolean;
  readonly internalApiKey: string;
  readonly chatServiceUrl: string;
  readonly chatServiceApiKey: string;
  readonly notificationServiceUrl: string;
  readonly notificationServiceApiKey: string;
  readonly addressMappings: AddressMapping;
}

export interface DatabaseConfig {
  /** Prisma-compatible connection string, empty when persistence is disabled. */
  readonly url: string;
  readonly enabled: boolean;
  readonly echo: boolean;
  readonly poolSize: number;
  readonly maxOverflow: number;
}

export interface KeycloakConfig {
  readonly url: string;
  readonly realm: string;
  readonly audience: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface EvolutionConfig {
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly instanceName: string;
  readonly webhookSecret: string;
  readonly corsOrigin: string;
}

export interface WhatsappSupportConfig {
  readonly eventMap: Readonly<Record<string, WhatsappSupportRoute>>;
}

export interface ResendConfig {
  readonly apiKey: string;
  readonly fromAddress: string;
  readonly baseUrl: string;
  readonly timeout: number;
}

export interface StalwartConfig {
  readonly enabled: boolean;
  readonly priority: number;
  readonly timeout: number;
  readonly host: string;
  readonly port: number;
  readonly username: string;
  readonly password: string;
  readonly authMode: StalwartAuthMode;
  readonly oauthTokenUrl: string;
  readonly oauthClientId: string;
  readonly oauthClientSecret: string;
  readonly fromAddress: string;
  readonly tlsEnabled: boolean;
  readonly tlsVerify: boolean;
}

export interface KafkaConfig {
  readonly broker: string;
  readonly acks: string;
  readonly retries: number;
  readonly topicDeliveryStatus: string;
}

export interface ObservabilityConfig {
  readonly tempoHealthUrl: string;
  readonly prometheusHealthUrl: string;
  readonly tracingEnabled: boolean;
  readonly samplingProbability: number;
}

export interface ForwarderConfig {
  /** Total attempts per forwarded event, including the first one. */
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
  readonly timeoutMs: number;
}

export interface CacheConfig {
  readonly url: string;
  readonly keyPrefix: string;
}

export interface AppConfig {
  readonly core: CoreConfig;
  readonly database: DatabaseConfig;
  readonly keycloak: KeycloakConfig;
  readonly evolution: EvolutionConfig;
  readonly whatsappSupport: WhatsappSupportConfig;
  readonly resend: ResendConfig;
  readonly stalwart: StalwartConfig;
  readonly kafka: KafkaConfig;
  readonly observability: ObservabilityConfig;
  readonly forwarder: ForwarderConfig;
  readonly cache: CacheConfig;
  readonly emailPrimary: EmailProviderName;
  readonly emailFallback: EmailProviderName;
}
