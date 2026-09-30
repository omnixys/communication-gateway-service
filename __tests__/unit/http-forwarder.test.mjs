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
import { createServer } from 'node:http';
import { after, before, describe, it } from 'node:test';

import { DeliveryStatus } from '../../dist/domain/enums.js';
import { HttpEventForwarder } from '../../dist/infrastructure/events/http-event.forwarder.js';
import { InMemoryEventPublisher } from '../../dist/infrastructure/events/in-memory-event.publisher.js';
import { InMemoryMessageMappingStore } from '../../dist/infrastructure/persistence/in-memory-message-mapping.store.js';
import {
  deliveryReceipt,
  inboundMessage,
  messageMapping,
} from './../support/fakes.mjs';

/** Records what the forwarder posts and answers with a scriptable status. */
class TargetServer {
  constructor() {
    this.requests = [];
    this.responses = [];
    this.server = createServer((request, response) => {
      const chunks = [];
      request.on('data', (chunk) => chunks.push(chunk));
      request.on('end', () => {
        this.requests.push({
          url: request.url,
          method: request.method,
          headers: request.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
        const status = this.responses.length > 0 ? this.responses.shift() : 200;
        response.writeHead(status, { 'content-type': 'application/json' });
        response.end('{"ok":true}');
      });
    });
  }

  async listen() {
    await new Promise((resolve) => this.server.listen(0, '127.0.0.1', resolve));
    return `http://127.0.0.1:${String(this.server.address().port)}`;
  }

  async close() {
    await new Promise((resolve) => this.server.close(resolve));
  }
}

const chat = new TargetServer();
const notification = new TargetServer();
let chatUrl = '';
let notificationUrl = '';

before(async () => {
  chatUrl = await chat.listen();
  notificationUrl = await notification.listen();
});

after(async () => {
  await chat.close();
  await notification.close();
});

const SUPPORT_ROUTE = {
  tenantId: '11111111-1111-4111-8111-111111111111',
  eventId: '33333333-3333-4333-8333-333333333333',
};

function build(eventMap = {}) {
  const publisher = new InMemoryEventPublisher();
  const store = new InMemoryMessageMappingStore();
  const forwarder = new HttpEventForwarder(
    publisher,
    {
      chatServiceUrl: chatUrl,
      chatServiceApiKey: 'chat-key',
      notificationServiceUrl: notificationUrl,
      notificationServiceApiKey: 'notification-key',
    },
    store,
    { maxAttempts: 3, baseDelayMs: 1, maxDelayMs: 4, timeoutMs: 2000 },
    eventMap,
  );

  return { publisher, store, forwarder };
}

/** Waits until the predicate holds, so the assertions never race the loop. */
async function until(predicate, description) {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.fail(`timed out waiting for ${description}`);
}

describe('HttpEventForwarder delivery status', () => {
  it('posts a receipt to the chat service with the service token', async () => {
    const { publisher, store, forwarder } = build();
    await store.save(
      messageMapping({
        internalId: 'internal-1',
        conversationId: '491700000000@c.us',
      }),
    );
    await forwarder.start();

    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt({ status: DeliveryStatus.DELIVERED }),
    });
    await until(() => chat.requests.length > 0, 'the delivery status post');
    await forwarder.stop();

    const [request] = chat.requests;
    assert.equal(request.url, '/api/v1/internal/delivery-status');
    assert.equal(request.method, 'POST');
    assert.equal(request.headers['x-api-key'], 'chat-key');

    const body = JSON.parse(request.body);
    assert.equal(body.provider_message_id, 'provider-message-1');
    assert.equal(body.status, 'DELIVERED');
    assert.equal(body.internal_message_id, 'internal-1');
    assert.equal(body.conversation_id, '491700000000@c.us');
  });

  it('still forwards a receipt whose mapping is unknown', async () => {
    const before = chat.requests.length;
    const { publisher, forwarder } = build();
    await forwarder.start();

    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt({ providerMessageId: 'unmapped-1' }),
    });
    await until(
      () => chat.requests.length > before,
      'the delivery status post',
    );
    await forwarder.stop();

    const body = JSON.parse(chat.requests.at(-1).body);
    assert.equal(body.provider_message_id, 'unmapped-1');
    assert.equal(body.internal_message_id, '');
  });

  it('retries a failing chat service and gives up after the configured budget', async () => {
    const before = chat.requests.length;
    chat.responses.push(503, 503, 503);
    const { publisher, forwarder } = build();

    await forwarder.start();
    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt({ providerMessageId: 'retry-1' }),
    });
    await until(() => chat.requests.length >= before + 3, 'three attempts');
    await forwarder.stop();

    assert.equal(chat.requests.length - before, 3);
  });

  it('recovers when a retry succeeds', async () => {
    const before = chat.requests.length;
    chat.responses.push(500);
    const { publisher, forwarder } = build();

    await forwarder.start();
    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt({ providerMessageId: 'retry-2' }),
    });
    await until(() => chat.requests.length >= before + 2, 'a successful retry');
    await forwarder.stop();

    assert.equal(chat.requests.length - before, 2);
  });
});

describe('HttpEventForwarder inbound messages', () => {
  it('posts an inbound whatsapp message to the notification service', async () => {
    const before = notification.requests.length;
    const { publisher, forwarder } = build({
      'communication-gateway-test': SUPPORT_ROUTE,
    });
    await forwarder.start();

    await publisher.publish({
      kind: 'InboundMessageReceived',
      message: inboundMessage({ messageId: 'inbound-1' }),
    });
    await until(
      () => notification.requests.length > before,
      'the inbound message post',
    );
    await forwarder.stop();

    const [request] = notification.requests.slice(before);
    assert.equal(request.url, '/internal/support/inbound-message');
    assert.equal(request.headers['x-internal-token'], 'notification-key');

    const body = JSON.parse(request.body);
    assert.equal(body.externalId, 'inbound-1');
    assert.equal(body.tenantId, SUPPORT_ROUTE.tenantId);
    assert.equal(body.eventId, SUPPORT_ROUTE.eventId);
    assert.equal(body.from, '491700000000@c.us');
    assert.equal(body.body, 'hello');
  });

  it('refuses to forward an instance that has no tenant route', async () => {
    const before = notification.requests.length;
    const { publisher, forwarder } = build();
    await forwarder.start();

    await publisher.publish({
      kind: 'InboundMessageReceived',
      message: inboundMessage({ messageId: 'unrouted-1' }),
    });
    await forwarder.stop();

    assert.equal(
      notification.requests.length,
      before,
      'a message without a tenant route must not reach another tenant',
    );
  });

  it('refuses to forward an instance that is routed to another instance name', async () => {
    const before = notification.requests.length;
    const { publisher, forwarder } = build({
      'some-other-instance': SUPPORT_ROUTE,
    });
    await forwarder.start();

    await publisher.publish({
      kind: 'InboundMessageReceived',
      message: inboundMessage({ messageId: 'routed-elsewhere-1' }),
    });
    await forwarder.stop();

    assert.equal(notification.requests.length, before);
  });

  it('reports its readiness so a caller can tell started from stopped', async () => {
    const { forwarder } = build();

    assert.equal(forwarder.ready, false);
    await forwarder.start();
    assert.equal(forwarder.ready, true);
    await forwarder.stop();
    assert.equal(forwarder.ready, false);
  });
});

describe('HttpEventForwarder shutdown', () => {
  it('forwards an event that was published just before the shutdown', async () => {
    const before = chat.requests.length;
    const { publisher, forwarder } = build();
    await forwarder.start();

    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt({ providerMessageId: 'drain-1' }),
    });
    await forwarder.stop();

    assert.equal(
      chat.requests.length - before,
      1,
      'the queued receipt is delivered before stop resolves',
    );
  });
});
