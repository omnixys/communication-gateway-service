import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { createTestApp, shutdownTestApp, type TestApp } from '../setup-e2e.js';

describe('communication-gateway e2e', () => {
  let testApp: TestApp;
  let app: TestApp['app'];

  beforeAll(async () => {
    testApp = await createTestApp();
    app = testApp.app;
  });

  afterAll(async () => {
    await shutdownTestApp(testApp);
  });

  describe('health probes', () => {
    it('reports liveness', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/liveness',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ status: 'ok' });
    });

    it('reports readiness once the database and forwarder are up', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/readiness',
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as {
        status: string;
        checks: Record<string, boolean>;
      };
      expect(body.status).toBe('ready');
      expect(body.checks.database).toBe(true);
      expect(body.checks.internalApiKey).toBe(true);
      expect(body.checks.eventForwarder).toBe(true);
    });
  });

  describe('internal api key guard', () => {
    it('rejects a request without the internal api key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/providers',
      });

      expect(response.statusCode).toBe(401);
    });

    it('lists the configured providers with the internal api key', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/providers',
        headers: { 'x-internal-api-key': 'test-internal-api-key' },
      });

      expect(response.statusCode).toBe(200);
      const providers = response.json() as Array<{ provider_type: string }>;
      expect(Array.isArray(providers)).toBe(true);
      expect(
        providers.some((provider) => provider.provider_type === 'EVOLUTION'),
      ).toBe(true);
    });
  });

  describe('graphql subgraph', () => {
    it('rejects an unauthenticated query', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        payload: { query: '{ providers { provider_type } }' },
      });

      const body = response.json() as { errors?: unknown[] };
      expect(body.errors).toBeDefined();
    });

    it('serves the provider list to an authenticated query', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/graphql',
        headers: { 'x-internal-api-key': 'test-internal-api-key' },
        payload: { query: '{ providers { provider_type } }' },
      });

      const body = response.json() as {
        errors?: unknown[];
        data: { providers: Array<{ provider_type: string }> };
      };
      expect(body.errors).toBeUndefined();
      expect(
        body.data.providers.map((provider) => provider.provider_type),
      ).toContain('EVOLUTION');
    });
  });

  describe('webhooks', () => {
    it('rejects a payload that presents no credential', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/EVOLUTION',
        payload: { event: 'messages.upsert', instance: 'test' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('accepts and ignores a verified unknown event', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/webhooks/EVOLUTION',
        headers: { apikey: 'test-evolution-key' },
        payload: { event: 'unknown.event', instance: 'test' },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ received: true, result: 'IGNORED' });
    });

    it('answers a GET challenge with 405', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/webhooks/EVOLUTION',
      });

      expect(response.statusCode).toBe(405);
    });
  });

  describe('outbound send', () => {
    it('fails closed when no provider is reachable', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/messages/send',
        headers: { 'x-internal-api-key': 'test-internal-api-key' },
        payload: {
          id: '4a1f0e2c-1111-7000-8000-0000000000aa',
          channel: 'WHATSAPP',
          recipientAddress: '491700000001@c.us',
          body: 'hello from e2e',
        },
      });

      expect(response.statusCode).toBe(503);
      expect(response.json()).toMatchObject({
        statusCode: 503,
        message: 'NO_PROVIDER_AVAILABLE',
      });
    });
  });
});
