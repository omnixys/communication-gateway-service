import { ConfigurationError } from '../communication-gateway/errors/gateway.errors.js';
import 'dotenv/config';
import process from 'node:process';
const EMAIL_PROVIDERS = [
    'resend',
    'stalwart',
    'none',
];
const AUTH_MODES = ['password', 'oauthbearer'];
export function readEnv(source) {
    const getEnv = (key, fallback = '') => {
        const value = source[key]?.trim();
        return (value === '' ? undefined : value) ?? fallback;
    };
    const integer = (key, fallback, positive = false) => {
        const raw = getEnv(key);
        if (!raw) {
            return fallback;
        }
        const value = Number(raw);
        if (!Number.isInteger(value) || (positive && value <= 0)) {
            throw new ConfigurationError(`${key} must be ${positive ? 'greater than 0' : 'an integer'}`);
        }
        return value;
    };
    const number = (key, fallback) => {
        const raw = getEnv(key);
        if (!raw) {
            return fallback;
        }
        const value = Number(raw);
        if (!Number.isFinite(value)) {
            throw new ConfigurationError(`${key} must be a number`);
        }
        return value;
    };
    const boolean = (key, fallback) => {
        const raw = getEnv(key).toLowerCase();
        if (!raw) {
            return fallback;
        }
        if (['true', '1', 'yes', 'on'].includes(raw)) {
            return true;
        }
        if (['false', '0', 'no', 'off'].includes(raw)) {
            return false;
        }
        throw new ConfigurationError(`${key} must be a boolean`);
    };
    const choice = (key, allowed, fallback) => {
        const value = getEnv(key, fallback).toLowerCase();
        if (!allowed.includes(value)) {
            throw new ConfigurationError(`${key} must be one of ${allowed.join(', ')}`);
        }
        return value;
    };
    const jsonObject = (key) => {
        const raw = getEnv(key, '{}');
        let value;
        try {
            value = JSON.parse(raw);
        }
        catch {
            throw new ConfigurationError(`${key} must be valid JSON`);
        }
        if (typeof value !== 'object' || value === null || Array.isArray(value)) {
            throw new ConfigurationError(`${key} must be a JSON object`);
        }
        return value;
    };
    const DATABASE_URL = getEnv('DATABASE_URL')
        .replace(/^postgres(ql)?\+[a-z0-9]+:\/\//i, 'postgresql://')
        .replace(/^postgres:\/\//i, 'postgresql://');
    if (!DATABASE_URL) {
        throw new ConfigurationError('Missing required env: DATABASE_URL');
    }
    const PORT = integer('PORT', 8000);
    if (PORT < 0 || PORT > 65535) {
        throw new ConfigurationError('PORT must be a valid TCP port');
    }
    const ADDRESS_MAPPINGS = jsonObject('ADDRESS_MAPPINGS');
    for (const [userId, channels] of Object.entries(ADDRESS_MAPPINGS)) {
        if (!userId ||
            typeof channels !== 'object' ||
            channels === null ||
            Array.isArray(channels)) {
            throw new ConfigurationError('ADDRESS_MAPPINGS must map user ids to channel addresses');
        }
        for (const address of Object.values(channels)) {
            if (typeof address !== 'string' || !address) {
                throw new ConfigurationError('ADDRESS_MAPPINGS contains an invalid address');
            }
        }
    }
    const WHATSAPP_SUPPORT_EVENT_MAP = jsonObject('WHATSAPP_SUPPORT_EVENT_MAP');
    for (const route of Object.values(WHATSAPP_SUPPORT_EVENT_MAP)) {
        if (typeof route !== 'object' ||
            route === null ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(route.tenantId) ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(route.eventId)) {
            throw new ConfigurationError('WHATSAPP_SUPPORT_EVENT_MAP contains an invalid route');
        }
    }
    const result = {
        SERVICE: getEnv('SERVICE', getEnv('SERVICE_NAME', 'communication-gateway')),
        NODE_ENV: getEnv('NODE_ENV', getEnv('ENVIRONMENT', 'local')),
        HOST: getEnv('HOST', '0.0.0.0'),
        PORT,
        LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),
        DATABASE_URL,
        INTERNAL_API_KEY: getEnv('INTERNAL_API_KEY'),
        CHAT_SERVICE_URL: getEnv('CHAT_SERVICE_URL'),
        CHAT_SERVICE_API_KEY: getEnv('CHAT_SERVICE_API_KEY'),
        NOTIFICATION_SERVICE_URL: getEnv('NOTIFICATION_SERVICE_URL'),
        NOTIFICATION_SERVICE_API_KEY: getEnv('NOTIFICATION_SERVICE_API_KEY'),
        ADDRESS_MAPPINGS,
        EVOLUTION_BASE_URL: getEnv('EVOLUTION_BASE_URL'),
        EVOLUTION_API_KEY: getEnv('EVOLUTION_API_KEY'),
        EVOLUTION_INSTANCE_NAME: getEnv('EVOLUTION_INSTANCE_NAME', 'omnixys'),
        EVOLUTION_WEBHOOK_SECRET: getEnv('EVOLUTION_WEBHOOK_SECRET'),
        WHATSAPP_SUPPORT_EVENT_MAP,
        RESEND_API_KEY: getEnv('RESEND_API_KEY'),
        RESEND_FROM_ADDRESS: getEnv('RESEND_FROM_ADDRESS'),
        RESEND_BASE_URL: getEnv('RESEND_BASE_URL', 'https://api.resend.com'),
        RESEND_TIMEOUT: integer('RESEND_TIMEOUT', 30, true),
        STALWART_ENABLED: boolean('STALWART_ENABLED', false),
        STALWART_PRIORITY: integer('STALWART_PRIORITY', 10),
        STALWART_TIMEOUT: integer('STALWART_TIMEOUT', 30, true),
        STALWART_HOST: getEnv('STALWART_HOST'),
        STALWART_PORT: integer('STALWART_PORT', 587),
        STALWART_USERNAME: getEnv('STALWART_USERNAME'),
        STALWART_PASSWORD: getEnv('STALWART_PASSWORD'),
        STALWART_AUTH_MODE: choice('STALWART_AUTH_MODE', AUTH_MODES, 'password'),
        STALWART_OAUTH_TOKEN_URL: getEnv('STALWART_OAUTH_TOKEN_URL'),
        STALWART_OAUTH_CLIENT_ID: getEnv('STALWART_OAUTH_CLIENT_ID'),
        STALWART_OAUTH_CLIENT_SECRET: getEnv('STALWART_OAUTH_CLIENT_SECRET'),
        STALWART_FROM_ADDRESS: getEnv('STALWART_FROM_ADDRESS'),
        STALWART_TLS_ENABLED: boolean('STALWART_TLS_ENABLED', true),
        STALWART_TLS_VERIFY: boolean('STALWART_TLS_VERIFY', true),
        KAFKA_BROKER: getEnv('KAFKA_BROKER'),
        KAFKA_RETRIES: integer('KAFKA_RETRIES', 3),
        KAFKA_TOPIC_DELIVERY_STATUS: getEnv('KAFKA_TOPIC_DELIVERY_STATUS', 'gateway.delivery.status'),
        FORWARDER_MAX_ATTEMPTS: integer('FORWARDER_MAX_ATTEMPTS', 3, true),
        FORWARDER_BASE_DELAY_MS: integer('FORWARDER_BASE_DELAY_MS', 200, true),
        FORWARDER_MAX_DELAY_MS: integer('FORWARDER_MAX_DELAY_MS', 2000, true),
        FORWARDER_TIMEOUT_MS: integer('FORWARDER_TIMEOUT_MS', 15000, true),
        EMAIL_PRIMARY: choice('EMAIL_PRIMARY', EMAIL_PROVIDERS, 'resend'),
        EMAIL_FALLBACK: choice('EMAIL_FALLBACK', EMAIL_PROVIDERS, 'none'),
        OTEL_SAMPLING_PROBABILITY: number('OTEL_SAMPLING_PROBABILITY', 0.1),
    };
    if (['production', 'development', 'staging'].includes(result.NODE_ENV.toLowerCase()) &&
        result.LOG_LEVEL !== 'test') {
        const required = {
            CHAT_SERVICE_URL: result.CHAT_SERVICE_URL,
            CHAT_SERVICE_API_KEY: result.CHAT_SERVICE_API_KEY,
            NOTIFICATION_SERVICE_URL: result.NOTIFICATION_SERVICE_URL,
            NOTIFICATION_SERVICE_API_KEY: result.NOTIFICATION_SERVICE_API_KEY,
            INTERNAL_API_KEY: result.INTERNAL_API_KEY,
            EVOLUTION_BASE_URL: result.EVOLUTION_BASE_URL,
            EVOLUTION_API_KEY: result.EVOLUTION_API_KEY,
            EVOLUTION_WEBHOOK_SECRET: result.EVOLUTION_WEBHOOK_SECRET,
            ...(result.EMAIL_PRIMARY === 'resend' ||
                result.EMAIL_FALLBACK === 'resend'
                ? {
                    RESEND_API_KEY: result.RESEND_API_KEY,
                    RESEND_FROM_ADDRESS: result.RESEND_FROM_ADDRESS,
                }
                : {}),
            ...(result.EMAIL_PRIMARY === 'stalwart' ||
                result.EMAIL_FALLBACK === 'stalwart'
                ? {
                    STALWART_HOST: result.STALWART_HOST,
                    STALWART_USERNAME: result.STALWART_USERNAME,
                    STALWART_PASSWORD: result.STALWART_PASSWORD,
                }
                : {}),
            ...(result.STALWART_AUTH_MODE === 'oauthbearer' &&
                (result.EMAIL_PRIMARY === 'stalwart' ||
                    result.EMAIL_FALLBACK === 'stalwart')
                ? {
                    STALWART_OAUTH_TOKEN_URL: result.STALWART_OAUTH_TOKEN_URL,
                    STALWART_OAUTH_CLIENT_ID: result.STALWART_OAUTH_CLIENT_ID,
                    STALWART_OAUTH_CLIENT_SECRET: result.STALWART_OAUTH_CLIENT_SECRET,
                }
                : {}),
        };
        const missing = Object.entries(required)
            .filter(([, value]) => !value)
            .map(([key]) => key);
        if (missing.length) {
            throw new ConfigurationError('Missing required production settings', missing);
        }
        if (result.INTERNAL_API_KEY.length < 16) {
            throw new ConfigurationError('INTERNAL_API_KEY must be at least 16 characters');
        }
        if (result.PORT === 0) {
            throw new ConfigurationError('PORT must be a valid TCP port');
        }
    }
    return result;
}
export const env = readEnv(process.env);
