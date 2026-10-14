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

import '../support/env.mjs';

import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';

import { PrismaService } from '../../dist/prisma/prisma.service.js';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';

import { AppModule } from '../../dist/app.module.js';
import { API_KEY_HEADER, INTERNAL_API_KEY } from '../support/env.mjs';

// @covers WebhooksController.challenge

let app;

/** Issues a request against the in-process gateway and returns status + body. */
async function call(path, { method = 'GET', headers = {}, body } = {}) {
  const response = await app
    .getHttpAdapter()
    .getInstance()
    .inject({
      method,
      url: path,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      ...(body === undefined ? {} : { payload: body }),
    });
  return {
    status: response.statusCode,
    body: response.body.length === 0 ? null : JSON.parse(response.body),
  };
}

const authorized = { [API_KEY_HEADER]: INTERNAL_API_KEY };

/** Minimal valid send request for the configured WHATSAPP channel. */
const MESSAGE = {
  id: '4a1f0e2c-0000-4000-8000-000000000001',
  channel: 'WHATSAPP',
  recipientAddress: '491700000001@c.us',
  body: 'hello',
};

async function createApp() {
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({ ping: async () => false })
    .compile();
  return module.createNestApplication(new FastifyAdapter(), { rawBody: true });
}

before(async () => {
  // rawBody mirrors the production bootstrap: the webhook route verifies an
  // HMAC over the exact bytes Evolution sent.
  app = await createApp();
  await app.init();
});

after(async () => {
  await app.close();
});

describe('health probes', () => {
  it('serves the liveness probes without an api key', async () => {
    for (const path of ['/health', '/health/live', '/health/liveness']) {
      const response = await call(path);

      assert.equal(response.status, 200, `${path} is public`);
      assert.equal(response.body.status, 'ok', `${path} reports ok`);
    }
  });

  it('reports 503 while a dependency is unreachable', async () => {
    const response = await call('/health/ready');

    assert.equal(response.status, 503, JSON.stringify(response.body));
    assert.equal(response.body.status, 'not_ready');
    assert.equal(
      response.body.checks.database,
      false,
      'the database is closed',
    );
    assert.equal(response.body.checks.internalApiKey, true);
    assert.equal(response.body.checks.eventForwarder, true);
  });

  it('serves the readiness alias with the same verdict', async () => {
    const response = await call('/health/readiness');

    assert.equal(response.status, 503);
    assert.equal(response.body.status, 'not_ready');
  });
});

describe('internal api key guard', () => {
  it('rejects a request without a key', async () => {
    const response = await call('/api/v1/providers');

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'INVALID_INTERNAL_API_KEY');
    assert.equal(response.body.error, 'Unauthorized');
    assert.equal(typeof response.body.correlationId, 'string');
  });

  it('rejects a wrong key', async () => {
    const response = await call('/api/v1/providers', {
      headers: { [API_KEY_HEADER]: 'wrong-key' },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'INVALID_INTERNAL_API_KEY');
  });

  it('rejects a key that only shares a prefix', async () => {
    const response = await call('/api/v1/providers', {
      headers: { [API_KEY_HEADER]: INTERNAL_API_KEY.slice(0, -1) },
    });

    assert.equal(response.status, 401);
  });

  it('accepts the configured key', async () => {
    const response = await call('/api/v1/providers', { headers: authorized });

    assert.equal(response.status, 200);
    assert.ok(Array.isArray(response.body));
  });

  it('answers 503 when no key is configured at all', async () => {
    const previous = process.env.INTERNAL_API_KEY;
    process.env.INTERNAL_API_KEY = '';
    const isolated = await createApp();
    await isolated.init();
    const response = await isolated.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/api/v1/providers',
    });
    await isolated.close();
    process.env.INTERNAL_API_KEY = previous;

    assert.equal(response.statusCode, 503);
  });
});

describe('providers api', () => {
  it('lists only the adapters that are configured', async () => {
    const response = await call('/api/v1/providers', { headers: authorized });
    const types = response.body.map((provider) => provider.provider_type);

    assert.deepEqual(
      types,
      ['EVOLUTION'],
      'only Evolution has credentials here',
    );
    for (const provider of response.body) {
      assert.equal(typeof provider.name, 'string');
      assert.equal(typeof provider.version, 'string');
      assert.equal(provider.supports_webhooks, true);
    }
  });

  it('reports an adapter without credentials as unavailable', async () => {
    const resend = await call('/api/v1/providers/RESEND/health', {
      headers: authorized,
    });

    assert.equal(
      resend.status,
      200,
      'a known provider type is still answerable',
    );
    assert.equal(resend.body.provider, 'RESEND');
    assert.notEqual(resend.body.status, 'healthy');
  });

  it('reports the health of one adapter', async () => {
    const response = await call('/api/v1/providers/EVOLUTION/health', {
      headers: authorized,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.provider, 'EVOLUTION');
    assert.equal(typeof response.body.status, 'string');
  });

  it('accepts a lowercase provider name', async () => {
    const response = await call('/api/v1/providers/evolution/health', {
      headers: authorized,
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.provider, 'EVOLUTION');
  });

  it('rejects a provider this gateway does not ship', async () => {
    const response = await call('/api/v1/providers/TWILIO/health', {
      headers: authorized,
    });

    assert.equal(response.status, 400);
  });
});

describe('messages api', () => {
  it('rejects an empty body', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: authorized,
      body: {},
    });

    assert.equal(response.status, 400);
    assert.equal(typeof response.body.correlationId, 'string');
  });

  it('rejects an unknown field instead of ignoring it', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: authorized,
      body: { ...MESSAGE, nope: true },
    });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /nope/u);
  });

  it('rejects a tenant header that is not a uuid', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: { ...authorized, 'x-tenant-id': 'not-a-uuid' },
      body: MESSAGE,
    });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /x-tenant-id/u);
  });

  it('rejects an unknown channel', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: authorized,
      body: { ...MESSAGE, channel: 'CARRIER_PIGEON' },
    });

    assert.equal(response.status, 400);
    assert.match(response.body.message, /channel/u);
  });

  it('rejects a sender id that is not a uuid', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: authorized,
      body: { ...MESSAGE, senderId: '12345' },
    });

    assert.equal(response.status, 400);
  });

  it('answers 503 when no provider can serve the channel', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: authorized,
      body: MESSAGE,
    });

    assert.equal(response.status, 503, 'evolution is unreachable in this run');
    assert.equal(response.body.message, 'NO_PROVIDER_AVAILABLE');
    assert.equal(response.body.error, 'SERVICE_UNAVAILABLE');
    assert.equal(typeof response.body.correlationId, 'string');
  });

  it('never leaks an internal class name to the caller', async () => {
    const response = await call('/api/v1/messages/send', {
      method: 'POST',
      headers: authorized,
      body: MESSAGE,
    });

    assert.equal(
      /Error$/u.test(response.body.error) && response.body.status === 500,
      false,
      'an expected domain failure is not reported as an internal error',
    );
  });
});

describe('webhooks api', () => {
  it('rejects a payload that presents no credential', async () => {
    const response = await call('/webhooks/EVOLUTION', {
      method: 'POST',
      body: { event: 'messages.upsert', instance: 'test' },
    });

    assert.equal(response.status, 401);
    assert.equal(response.body.message, 'WEBHOOK_VERIFICATION_FAILED');
  });

  it('rejects a payload with a wrong api key', async () => {
    const response = await call('/webhooks/EVOLUTION', {
      method: 'POST',
      headers: { apikey: 'wrong-key' },
      body: { event: 'messages.upsert', instance: 'test' },
    });

    assert.equal(response.status, 401);
  });

  it('rejects a webhook for an adapter that is not registered', async () => {
    const response = await call('/webhooks/TWILIO', {
      method: 'POST',
      headers: { apikey: 'test-evolution-key' },
      body: {},
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.message, 'UNKNOWN_PROVIDER');
  });

  it('refuses a GET on a webhook route', async () => {
    const response = await call('/webhooks/EVOLUTION');

    assert.equal(response.status, 405);
  });
});

describe('graphql api', () => {
  it('rejects a query without the internal key', async () => {
    const response = await call('/graphql', {
      method: 'POST',
      body: { query: '{ providers { provider_type } }' },
    });

    assert.equal(response.body.data, null);
    assert.equal(response.body.errors[0].message, 'INVALID_INTERNAL_API_KEY');
  });

  it('returns the providers in snake_case', async () => {
    const response = await call('/graphql', {
      method: 'POST',
      headers: authorized,
      body: {
        query: '{ providers { provider_type connected health capabilities } }',
      },
    });

    assert.equal(response.body.errors, undefined);
    assert.deepEqual(
      response.body.data.providers.map((provider) => provider.provider_type),
      ['EVOLUTION'],
    );
    assert.deepEqual(response.body.data.providers[0].capabilities.sort(), [
      'delivery_status',
      'read_receipts',
      'typing',
    ]);
  });

  it('returns a single configured provider', async () => {
    const response = await call('/graphql', {
      method: 'POST',
      headers: authorized,
      body: {
        query: '{ provider(provider_type: "EVOLUTION") { provider_type } }',
      },
    });

    assert.equal(response.body.data.provider.provider_type, 'EVOLUTION');
  });

  it('reports the gateway health', async () => {
    const response = await call('/graphql', {
      method: 'POST',
      headers: authorized,
      body: {
        query: '{ gatewayHealth { status provider_count healthy_providers } }',
      },
    });

    assert.equal(response.body.errors, undefined);
    assert.equal(response.body.data.gatewayHealth.provider_count, 1);
    assert.equal(response.body.data.gatewayHealth.healthy_providers, 0);
  });

  it('returns null for an unknown provider instead of failing', async () => {
    const response = await call('/graphql', {
      method: 'POST',
      headers: authorized,
      body: {
        query: '{ provider(provider_type: "TWILIO") { provider_type } }',
      },
    });

    assert.equal(response.body.data.provider, null);
  });

  it('serves the subgraph SDL that IntrospectAndCompose reads', async () => {
    const response = await call('/graphql', {
      method: 'POST',
      headers: authorized,
      body: { query: '{ _service { sdl } }' },
    });

    assert.equal(response.body.errors, undefined);
    const { sdl } = response.body.data._service;
    assert.match(sdl, /type ProviderStatus/);
    assert.match(sdl, /gatewayHealth: GatewayHealth/);
    assert.match(
      sdl,
      /@link\(url: "https:\/\/specs\.apollo\.dev\/federation\/v2\./,
      'the SDL is linked to the federation v2 spec',
    );
  });
});

describe('unknown routes', () => {
  it('answers 404 in the documented error shape', async () => {
    const response = await call('/api/v1/nope', { headers: authorized });

    assert.equal(response.status, 404);
    assert.equal(response.body.error, 'Not Found');
    assert.equal(typeof response.body.correlationId, 'string');
  });
});
