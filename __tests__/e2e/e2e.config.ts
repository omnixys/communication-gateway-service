import type { StartInfrastructureOptions } from '../../../test-tools/e2e/infrastructure.mjs';

/**
 * E2E infrastructure declaration for the communication-gateway.
 *
 * Kafka is disabled (`KAFKA_BROKER` empty), so only PostgreSQL is required.
 * `DATABASE_URL` is provided by the shared toolkit.
 */
const config: StartInfrastructureOptions = {
  serviceDir: process.cwd(),
  needs: { postgres: true, valkey: false, kafka: false, keycloak: false },
  kafkaTopics: [],
  env: {
    NODE_ENV: 'test',
    DOTENV_CONFIG_PATH: '/dev/null',
    ENVIRONMENT: 'local',
    SERVICE: 'communication-gateway',
    LOG_LEVEL: 'silent',
    PORT: '0',
    INTERNAL_API_KEY: 'test-internal-api-key',
    KAFKA_BROKER: '',
    KAFKA_CLIENT_ID: 'communication-gateway-e2e',
    KAFKA_CONSUMER_GROUP: 'communication-gateway-e2e',
    CHAT_SERVICE_URL: 'http://127.0.0.1:9',
    CHAT_SERVICE_API_KEY: 'test-chat-key',
    NOTIFICATION_SERVICE_URL: 'http://127.0.0.1:9',
    NOTIFICATION_SERVICE_API_KEY: 'test-notification-key',
    EVOLUTION_BASE_URL: 'http://127.0.0.1:9',
    EVOLUTION_API_KEY: 'test-evolution-key',
    EVOLUTION_INSTANCE_NAME: 'communication-gateway-e2e',
    RESEND_API_KEY: '',
    EMAIL_PRIMARY: 'none',
    EMAIL_FALLBACK: 'none',
    STALWART_ENABLED: 'false',
    STALWART_HOST: '127.0.0.1',
    STALWART_PORT: '9',
    STALWART_TLS_ENABLED: 'false',
  },
};

export default config;
