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
import { createHmac } from 'node:crypto';
import { describe, it } from 'node:test';

import {
  CommunicationProviderType,
  DeliveryStatus,
} from '../../dist/communication-gateway/domain/enums.js';
import { EvolutionProvider } from '../../dist/adapter/providers/evolution/evolution.provider.js';
import {
  verifyApiKey,
  verifyBearerSecret,
  verifyEvolutionSignature,
} from '../../dist/adapter/providers/evolution/evolution.webhook-verifier.js';

const API_KEY = 'evolution-api-key';
const WEBHOOK_SECRET = 'evolution-webhook-secret';
const BODY = Buffer.from(
  JSON.stringify({
    event: 'messages.upsert',
    instance: 'omnixys',
    data: { key: { id: 'M1', remoteJid: '491700000000@c.us', fromMe: false } },
  }),
);

function provider(configOverrides = {}, timeoutMs = 1000) {
  return new EvolutionProvider(
    {
      baseUrl: 'http://evolution.invalid',
      apiKey: API_KEY,
      instanceName: 'omnixys',
      webhookSecret: '',
      ...configOverrides,
    },
    timeoutMs,
  );
}

describe('verifyApiKey', () => {
  it('accepts only an exact match', () => {
    assert.equal(verifyApiKey(API_KEY, API_KEY), true);
    assert.equal(verifyApiKey(`${API_KEY}x`, API_KEY), false);
    assert.equal(verifyApiKey(API_KEY.slice(0, -1), API_KEY), false);
  });

  it('rejects an absent candidate and an unconfigured expectation', () => {
    assert.equal(verifyApiKey(null, API_KEY), false);
    assert.equal(verifyApiKey('', API_KEY), false);
    assert.equal(verifyApiKey(API_KEY, ''), false);
  });
});

describe('verifyEvolutionSignature', () => {
  const signature = createHmac('sha256', WEBHOOK_SECRET)
    .update(BODY)
    .digest('hex');

  it('accepts a bare hex digest', () => {
    assert.equal(
      verifyEvolutionSignature(BODY, WEBHOOK_SECRET, signature),
      true,
    );
  });

  it('accepts the sha256= prefixed form', () => {
    assert.equal(
      verifyEvolutionSignature(BODY, WEBHOOK_SECRET, `sha256=${signature}`),
      true,
    );
  });

  it('rejects a signature computed over a different body', () => {
    const other = createHmac('sha256', WEBHOOK_SECRET)
      .update(Buffer.from('{}'))
      .digest('hex');

    assert.equal(verifyEvolutionSignature(BODY, WEBHOOK_SECRET, other), false);
  });

  it('rejects a missing signature instead of trusting the request', () => {
    assert.equal(verifyEvolutionSignature(BODY, WEBHOOK_SECRET, null), false);
    assert.equal(verifyEvolutionSignature(BODY, WEBHOOK_SECRET, ''), false);
  });

  it('rejects any signature when no secret is configured', () => {
    assert.equal(verifyEvolutionSignature(BODY, '', signature), false);
  });
});

describe('verifyBearerSecret', () => {
  it('accepts a bearer token equal to the webhook secret', () => {
    assert.equal(
      verifyBearerSecret(
        { authorization: `Bearer ${WEBHOOK_SECRET}` },
        WEBHOOK_SECRET,
      ),
      true,
    );
  });

  it('is case insensitive about the header name only', () => {
    assert.equal(
      verifyBearerSecret(
        { Authorization: `Bearer ${WEBHOOK_SECRET}` },
        WEBHOOK_SECRET,
      ),
      true,
    );
  });

  it('rejects a different, missing or malformed token', () => {
    assert.equal(
      verifyBearerSecret({ authorization: 'Bearer nope' }, WEBHOOK_SECRET),
      false,
    );
    assert.equal(
      verifyBearerSecret({ authorization: WEBHOOK_SECRET }, WEBHOOK_SECRET),
      false,
    );
    assert.equal(verifyBearerSecret({}, WEBHOOK_SECRET), false);
    assert.equal(
      verifyBearerSecret({ authorization: 'Basic abc' }, WEBHOOK_SECRET),
      false,
    );
  });
});

describe('EvolutionProvider.verifyWebhook', () => {
  it('rejects a webhook that presents no credential at all', async () => {
    assert.equal(await provider().verifyWebhook({}, BODY), false);
  });

  it('rejects an unknown api key header', async () => {
    assert.equal(
      await provider().verifyWebhook({ apikey: 'wrong' }, BODY),
      false,
    );
  });

  it('accepts the configured api key in the apikey header', async () => {
    assert.equal(
      await provider().verifyWebhook({ apikey: API_KEY }, BODY),
      true,
    );
  });

  it('accepts the configured api key in the x-api-key header', async () => {
    assert.equal(
      await provider().verifyWebhook({ 'x-api-key': API_KEY }, BODY),
      true,
    );
  });

  it('accepts the configured api key inside the body', async () => {
    const body = Buffer.from(JSON.stringify({ apikey: API_KEY, event: 'x' }));
    assert.equal(await provider().verifyWebhook({}, body), true);
  });

  it('accepts a valid hmac signature when a webhook secret is configured', async () => {
    const signature = createHmac('sha256', WEBHOOK_SECRET)
      .update(BODY)
      .digest('hex');
    const instance = provider({ webhookSecret: WEBHOOK_SECRET });

    assert.equal(
      await instance.verifyWebhook({ 'x-signature': signature }, BODY),
      true,
    );
  });

  it('accepts the legacy evolution signature header as well', async () => {
    const signature = createHmac('sha256', WEBHOOK_SECRET)
      .update(BODY)
      .digest('hex');
    const instance = provider({ webhookSecret: WEBHOOK_SECRET });

    assert.equal(
      await instance.verifyWebhook(
        { 'x-evolution-signature': signature },
        BODY,
      ),
      true,
    );
  });

  it('rejects a wrong signature even when the api key is missing', async () => {
    const instance = provider({ webhookSecret: WEBHOOK_SECRET });

    assert.equal(
      await instance.verifyWebhook({ 'x-signature': 'deadbeef' }, BODY),
      false,
    );
  });

  it('accepts a bearer secret even when the api key does not match', async () => {
    const instance = provider({ webhookSecret: WEBHOOK_SECRET });

    assert.equal(
      await instance.verifyWebhook(
        { authorization: `Bearer ${WEBHOOK_SECRET}` },
        BODY,
      ),
      true,
    );
  });

  it('rejects everything when no credential is configured on the instance', async () => {
    const instance = provider({ apiKey: '', webhookSecret: '' });

    assert.equal(
      await instance.verifyWebhook({ apikey: 'anything' }, BODY),
      false,
    );
    assert.equal(
      await instance.verifyWebhook({ 'x-signature': 'anything' }, BODY),
      false,
    );
  });
});

describe('EvolutionProvider.handleWebhook', () => {
  it('maps an inbound whatsapp message', async () => {
    const result = await provider().handleWebhook({}, BODY);

    assert.equal(result.kind, 'inboundMessage');
    assert.equal(
      result.message.providerType,
      CommunicationProviderType.EVOLUTION,
    );
    assert.equal(result.message.from, '491700000000@c.us');
    assert.equal(result.message.providerInstance, 'omnixys');
  });

  it('maps a status update onto a delivery receipt', async () => {
    const body = Buffer.from(
      JSON.stringify({
        event: 'messages.update',
        instance: 'omnixys',
        data: {
          key: { id: 'M1', status: 'PENDING' },
          status: 'PENDING',
        },
      }),
    );

    const result = await provider().handleWebhook({}, body);

    assert.equal(result.kind, 'deliveryReceipt');
    assert.equal(result.receipt.providerMessageId, 'M1');
  });

  it('ignores an event it does not handle', async () => {
    const body = Buffer.from(
      JSON.stringify({ event: 'connection.update', instance: 'omnixys' }),
    );

    assert.equal((await provider().handleWebhook({}, body)).kind, 'ignored');
  });

  it('ignores an upsert without message data', async () => {
    const body = Buffer.from(
      JSON.stringify({
        event: 'messages.upsert',
        instance: 'omnixys',
        data: {},
      }),
    );

    assert.equal((await provider().handleWebhook({}, body)).kind, 'ignored');
  });

  it('ignores a body that is not json instead of throwing', async () => {
    assert.equal(
      (await provider().handleWebhook({}, Buffer.from('<html>oops</html>')))
        .kind,
      'ignored',
    );
  });
});

describe('EvolutionProvider.health and capabilities', () => {
  it('reports unavailable while the instance does not answer', async () => {
    const instance = provider({ baseUrl: 'http://127.0.0.1:1' }, 250);
    assert.equal(await instance.health(), false);
  });

  it('advertises the capabilities of a whatsapp bridge', async () => {
    const capabilities = await provider().capabilities();

    assert.equal(capabilities.supports_typing, true);
    assert.equal(capabilities.supports_read_receipts, true);
    assert.equal(capabilities.supports_delivery_status, true);
    assert.equal(capabilities.supports_attachments, false);
  });

  it('exposes its identity for the registry and GraphQL', () => {
    const metadata = provider().metadata;

    assert.equal(
      metadata.identity.providerType,
      CommunicationProviderType.EVOLUTION,
    );
    assert.equal(metadata.identity.instance, 'omnixys');
    assert.equal(metadata.supportsWebhooks, true);
    assert.equal(metadata.supportsHealth, true);
  });
});

describe('EvolutionProvider.send', () => {
  it('rejects a send while the instance is unreachable', async () => {
    const instance = provider({ baseUrl: 'http://127.0.0.1:1' }, 250);

    const response = await instance.send({
      id: 'internal-1',
      channel: { type: 'WHATSAPP' },
      to: '491700000001@c.us',
      body: 'hello',
      contentType: 'TEXT',
      attachment: null,
      metadata: {},
    });

    assert.equal(response.success, false);
    assert.notEqual(response.status, DeliveryStatus.SENT);
    assert.ok(response.error !== null);
  });
});
