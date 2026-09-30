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

import { WebhookService } from '../../dist/application/services/webhook.service.js';
import {
  CommunicationProviderType,
  DeliveryStatus,
} from '../../dist/domain/enums.js';
import { WebhookVerificationError } from '../../dist/domain/errors.js';
import { InMemoryMessageMappingStore } from '../../dist/infrastructure/persistence/in-memory-message-mapping.store.js';
import {
  FakeProvider,
  FakeRegistry,
  RecordingEventPublisher,
  deliveryReceipt,
  inboundMessage,
  messageMapping,
} from './../support/fakes.mjs';

const BODY = Buffer.from('{"event":"messages.upsert"}');
const HEADERS = { apikey: 'key' };

function build(providerOverrides = {}) {
  const provider = new FakeProvider(providerOverrides);
  const registry = new FakeRegistry([provider]);
  const publisher = new RecordingEventPublisher();
  const store = new InMemoryMessageMappingStore();
  const service = new WebhookService(registry, publisher, store);

  return { provider, publisher, store, service };
}

describe('WebhookService authentication', () => {
  it('rejects a webhook whose credentials do not verify', async () => {
    const { service } = build({ verifyResult: false });

    await assert.rejects(
      service.processWebhook(
        CommunicationProviderType.EVOLUTION,
        HEADERS,
        BODY,
      ),
      WebhookVerificationError,
    );
  });

  it('rejects a webhook for a provider that is not registered', async () => {
    const { service } = build();

    await assert.rejects(
      service.processWebhook(CommunicationProviderType.STALWART, HEADERS, BODY),
      WebhookVerificationError,
    );
  });

  it('never interprets the payload when verification fails', async () => {
    const { provider, service } = build({ verifyResult: false });

    await assert.rejects(
      service.processWebhook(
        CommunicationProviderType.EVOLUTION,
        HEADERS,
        BODY,
      ),
    );

    assert.equal(provider.verifyCalls, 1);
    assert.equal(provider.handleCalls, 0);
  });
});

describe('WebhookService inbound messages', () => {
  it('emits an InboundMessageReceived for a new message', async () => {
    const { service, publisher } = build({
      webhookResult: { kind: 'inboundMessage', message: inboundMessage() },
    });

    const outcome = await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(outcome, 'INBOUND_MESSAGE');
    assert.equal(publisher.events.length, 1);
    assert.equal(publisher.events[0].kind, 'InboundMessageReceived');
  });

  it('acknowledges a repeated webhook without emitting a second event', async () => {
    const { service, publisher, store } = build({
      webhookResult: { kind: 'inboundMessage', message: inboundMessage() },
    });
    await store.save(messageMapping({ status: DeliveryStatus.DELIVERED }));

    const outcome = await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(outcome, 'INBOUND_MESSAGE');
    assert.equal(publisher.events.length, 0);
  });

  it('treats a pending mapping as already handled', async () => {
    const { service, publisher, store } = build({
      webhookResult: { kind: 'inboundMessage', message: inboundMessage() },
    });
    await store.save(messageMapping({ status: DeliveryStatus.PENDING }));

    await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(publisher.events.length, 0);
  });

  it('treats a failed mapping as already handled', async () => {
    const { service, publisher, store } = build({
      webhookResult: { kind: 'inboundMessage', message: inboundMessage() },
    });
    await store.save(messageMapping({ status: DeliveryStatus.FAILED }));

    await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(publisher.events.length, 0);
  });

  it('does not confuse two providers that reuse the same message id', async () => {
    const { service, publisher, store } = build({
      providerType: CommunicationProviderType.RESEND,
      webhookResult: {
        kind: 'inboundMessage',
        message: inboundMessage({
          providerType: CommunicationProviderType.RESEND,
        }),
      },
    });
    await store.save(messageMapping({ status: DeliveryStatus.SENT }));

    await service.processWebhook(
      CommunicationProviderType.RESEND,
      HEADERS,
      BODY,
    );

    assert.equal(publisher.events.length, 1);
  });

  it('acknowledges an unsupported provider event as ignored', async () => {
    const { service, publisher } = build({
      webhookResult: { kind: 'ignored' },
    });

    const outcome = await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(outcome, 'IGNORED');
    assert.equal(publisher.events.length, 0);
  });
});

describe('WebhookService delivery receipts', () => {
  it('applies a status change to the stored mapping', async () => {
    const { service, store } = build({
      webhookResult: {
        kind: 'deliveryReceipt',
        receipt: deliveryReceipt({ status: DeliveryStatus.DELIVERED }),
      },
    });
    await store.save(messageMapping({ status: DeliveryStatus.SENT }));

    const outcome = await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(outcome, 'DELIVERY_RECEIPT');
    const mapping = await store.getByProviderMessageId('provider-message-1');
    assert.equal(mapping.status, DeliveryStatus.DELIVERED);
  });

  it('skips a receipt that repeats the stored status', async () => {
    const { service, publisher, store } = build({
      webhookResult: {
        kind: 'deliveryReceipt',
        receipt: deliveryReceipt({ status: DeliveryStatus.DELIVERED }),
      },
    });
    await store.save(messageMapping({ status: DeliveryStatus.DELIVERED }));

    await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(publisher.events.length, 0);
  });

  it('refuses a receipt that would walk the lifecycle backwards', async () => {
    const { service, store } = build({
      webhookResult: {
        kind: 'deliveryReceipt',
        receipt: deliveryReceipt({ status: DeliveryStatus.SENT }),
      },
    });
    await store.save(messageMapping({ status: DeliveryStatus.READ }));

    await assert.rejects(
      service.processWebhook(
        CommunicationProviderType.EVOLUTION,
        HEADERS,
        BODY,
      ),
    );
  });

  it('still forwards a receipt for a message it never sent', async () => {
    const { service, publisher } = build({
      webhookResult: {
        kind: 'deliveryReceipt',
        receipt: deliveryReceipt(),
      },
    });

    await service.processWebhook(
      CommunicationProviderType.EVOLUTION,
      HEADERS,
      BODY,
    );

    assert.equal(publisher.events.length, 1);
    assert.equal(publisher.events[0].kind, 'MessageDelivered');
  });
});
