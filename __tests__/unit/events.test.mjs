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

import { backoffDelay } from '../../dist/adapter/events/http-event.forwarder.js';
import { InMemoryEventPublisher } from '../../dist/adapter/events/in-memory-event.publisher.js';
import { KafkaDeliveryEventHandler } from '../../dist/adapter/events/kafka-delivery-event.handler.js';
import { DisabledRawEventPublisher } from '../../dist/adapter/events/kafka-raw-event.publisher.js';
import {
  CommunicationProviderType,
  DeliveryStatus,
} from '../../dist/communication-gateway/models/enums/gateway.enums.js';
import {
  RecordingRawPublisher,
  deliveryReceipt,
  inboundMessage,
} from '../support/fakes.mjs';

describe('InMemoryEventPublisher', () => {
  it('delivers an event to a subscriber of that kind', async () => {
    const publisher = new InMemoryEventPublisher();
    const received = [];
    const subscription = publisher.subscribe('InboundMessageReceived');
    void (async () => {
      for await (const event of subscription) {
        received.push(event);
        break;
      }
    })();

    await publisher.publish({
      kind: 'InboundMessageReceived',
      message: inboundMessage(),
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(received.length, 1);
    assert.equal(received[0].message.messageId, 'provider-message-1');
    await publisher.close();
  });

  it('does not deliver an event to a subscriber of another kind', async () => {
    const publisher = new InMemoryEventPublisher();
    const received = [];
    const subscription = publisher.subscribe('MessageDelivered');
    void (async () => {
      for await (const event of subscription) {
        received.push(event);
        break;
      }
    })();

    await publisher.publish({
      kind: 'ProviderStatusChanged',
      providerType: CommunicationProviderType.EVOLUTION,
      status: 'DISCONNECTED',
    });
    await new Promise((resolve) => setImmediate(resolve));

    assert.deepEqual(received, []);
    await publisher.close();
  });

  it('accepts an event nobody listens for', async () => {
    const publisher = new InMemoryEventPublisher();

    await assert.doesNotReject(
      publisher.publish({
        kind: 'ProviderStatusChanged',
        providerType: CommunicationProviderType.RESEND,
        status: 'CONNECTED',
      }),
    );
    await publisher.close();
  });

  it('keeps every subscriber independent', async () => {
    const publisher = new InMemoryEventPublisher();
    const first = [];
    const second = [];
    const consume = async (target) => {
      for await (const event of publisher.subscribe('InboundMessageReceived')) {
        target.push(event);
        break;
      }
    };
    const running = [consume(first), consume(second)];
    await new Promise((resolve) => setImmediate(resolve));

    await publisher.publish({
      kind: 'InboundMessageReceived',
      message: inboundMessage(),
    });
    await Promise.all(running);

    assert.equal(first.length, 1);
    assert.equal(second.length, 1);
    await publisher.close();
  });
});

describe('backoffDelay', () => {
  const config = {
    maxAttempts: 3,
    baseDelayMs: 200,
    maxDelayMs: 2000,
    timeoutMs: 15000,
  };

  it('keeps the delay inside the full jitter window of the exponential term', () => {
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const exponential = Math.min(
        config.maxDelayMs,
        config.baseDelayMs * 2 ** (attempt - 1),
      );

      for (let sample = 0; sample < 50; sample += 1) {
        const delay = backoffDelay(attempt, config);

        assert.ok(delay >= 0, `attempt ${String(attempt)} is never negative`);
        assert.ok(
          delay <= exponential,
          `attempt ${String(attempt)} stays at or below its exponential term`,
        );
        assert.ok(delay <= config.maxDelayMs, 'stays under the ceiling');
      }
    }
  });

  it('grows the expected window with every attempt', () => {
    assert.ok(backoffDelay(1, config) <= 200);
    assert.ok(
      backoffDelay(5, config) >= 800,
      'attempt 5 waits at least 800ms at worst case jitter',
    );
  });

  it('caps a long retry chain', () => {
    for (let sample = 0; sample < 20; sample += 1) {
      assert.equal(backoffDelay(30, config) <= config.maxDelayMs, true);
    }
  });
});

describe('DisabledRawEventPublisher', () => {
  it('reports itself as disabled so consumers stay idle', () => {
    assert.equal(new DisabledRawEventPublisher().enabled, false);
  });

  it('drops a publish instead of failing the caller', async () => {
    const publisher = new DisabledRawEventPublisher();

    await assert.doesNotReject(publisher.publishRaw('topic', '{}'));
    await assert.doesNotReject(publisher.shutdown());
  });
});

describe('KafkaDeliveryEventHandler', () => {
  it('publishes a terminal receipt onto the delivery topic', async () => {
    const publisher = new InMemoryEventPublisher();
    const raw = new RecordingRawPublisher();
    const store = new Map();

    const handler = new KafkaDeliveryEventHandler(publisher, raw, {
      getByProviderMessageId: async (id) => store.get(id) ?? null,
    });

    await handler.start();
    store.set('provider-message-1', {
      internalId: 'internal-1',
      conversationId: '491700000000@c.us',
      channel: 'WHATSAPP',
    });

    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt({ status: DeliveryStatus.DELIVERED }),
    });
    await handler.stop();

    assert.equal(raw.messages.length, 1);
    assert.equal(raw.messages[0].topic, 'gateway.delivery.status');
    assert.equal(raw.messages[0].key, 'internal-1');

    const envelope = raw.parsed()[0];
    assert.equal(envelope.status, 'DELIVERED');
    assert.equal(envelope.messageId, 'internal-1');
    assert.equal(envelope.provider, CommunicationProviderType.EVOLUTION);
    assert.equal(raw.messages[0].headers['x-status'], 'DELIVERED');
  });

  it('falls back to the provider message id when no mapping exists', async () => {
    const publisher = new InMemoryEventPublisher();
    const raw = new RecordingRawPublisher();
    const handler = new KafkaDeliveryEventHandler(publisher, raw, {
      getByProviderMessageId: async () => null,
    });

    await handler.start();
    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt(),
    });
    await handler.stop();

    assert.equal(raw.messages[0].key, 'provider-message-1');
    assert.equal(raw.parsed()[0].messageId, '');
  });

  it('still publishes when the mapping lookup fails', async () => {
    const publisher = new InMemoryEventPublisher();
    const raw = new RecordingRawPublisher();
    const handler = new KafkaDeliveryEventHandler(publisher, raw, {
      getByProviderMessageId: async () => {
        throw new Error('database is down');
      },
    });

    await handler.start();
    await publisher.publish({
      kind: 'MessageDelivered',
      receipt: deliveryReceipt(),
    });
    await handler.stop();

    assert.equal(raw.messages.length, 1);
  });

  it('stays idle when no broker is configured', async () => {
    const publisher = new InMemoryEventPublisher();
    const raw = new RecordingRawPublisher({ enabled: false });
    const handler = new KafkaDeliveryEventHandler(publisher, raw, {
      findByProviderAndProviderMessageId: async () => null,
      updateStatus: async () => {},
    });

    await handler.start();
    await handler.stop();

    assert.equal(raw.messages.length, 0);
    assert.equal(raw.shutdownCalls, 1);
  });

  it('ignores a receipt for an unknown provider message', async () => {
    const publisher = new InMemoryEventPublisher();
    const raw = new RecordingRawPublisher();
    const handler = new KafkaDeliveryEventHandler(publisher, raw, {
      getByProviderMessageId: async () => {
        throw new Error('must not be consulted while disabled');
      },
    });

    await handler.start();
    await handler.stop();

    assert.equal(raw.messages.length, 0);
  });
});
