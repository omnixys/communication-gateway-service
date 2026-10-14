import type { InboundMessage } from '../../dist/communication-gateway/models/entities/inbound-message.model.js';
import type { WebhookResult } from '../../dist/communication-gateway/models/interfaces/communication-provider.port.js';
import type { DeliveryReceipt } from '../../dist/communication-gateway/models/payloads/delivery-receipt.model.js';
import '../support/env.mjs';
import {
  NOW,
  mapping,
  response,
  CommunicationProviderType,
  CommunicationChannelType,
  DeliveryStatus,
} from './gateway-fixtures.ts';
import assert from 'node:assert/strict';
import test, { type Mock, type TestContext } from 'node:test';

const { GatewayDispatcher } =
  await import('../../dist/communication-gateway/services/gateway-dispatcher.service.js');
const { WebhookService } =
  await import('../../dist/communication-gateway/services/webhook.service.js');

// @covers GatewayDispatcher.dispatch
for (const result of [
  response,
  { ...response, success: false, error: 'unit-failure' },
]) {
  await test(`dispatch preserves the complete provider response success=${result.success}`, async (context) => {
    const message = {
      id: mapping.internalId,
      channel: { type: mapping.channel },
      to: mapping.recipient,
      body: 'Unit message',
      contentType: 'TEXT',
      attachment: null,
      metadata: {},
    };
    const scope = {
      tenantId: mapping.tenantId,
      deploymentId: null,
      metadata: {},
    };
    const send = context.mock.fn(async (..._args: unknown[]) => result);
    const provider = { providerType: mapping.provider, send };
    const resolve = context.mock.fn(async (..._args: unknown[]) => provider);
    const getByChannel = context.mock.fn((..._args: unknown[]) => ({
      resolver: { resolve },
    }));
    const subject = new GatewayDispatcher({
      getByChannel,
    } as unknown as ConstructorParameters<typeof GatewayDispatcher>[0]);
    assert.equal(await subject.dispatch(message, scope), result);
    assert.deepEqual(getByChannel.mock.calls[0]?.arguments, [message.channel]);
    assert.deepEqual(resolve.mock.calls[0]?.arguments, [message, scope]);
    assert.deepEqual(send.mock.calls[0]?.arguments, [message]);
  });
}
for (const stage of ['registry', 'resolver', 'send'] as const) {
  await test(`dispatch preserves ${stage} failure and stops later boundaries`, async (context) => {
    const failure = new Error(stage);
    const send = context.mock.fn(async () => {
      if (stage === 'send') {
        throw failure;
      }
      return response;
    });
    const resolve = context.mock.fn(async () => {
      if (stage === 'resolver') {
        throw failure;
      }
      return { providerType: mapping.provider, send };
    });
    const getByChannel = context.mock.fn(() => {
      if (stage === 'registry') {
        throw failure;
      }
      return { resolver: { resolve } };
    });
    const subject = new GatewayDispatcher({
      getByChannel,
    } as unknown as ConstructorParameters<typeof GatewayDispatcher>[0]);
    await assert.rejects(
      subject.dispatch({
        id: mapping.internalId,
        channel: { type: mapping.channel },
        to: mapping.recipient,
        body: 'Unit message',
        contentType: 'TEXT',
        attachment: null,
        metadata: {},
      }),
      (error) => error === failure,
    );
    if (stage === 'registry') {
      assert.equal(resolve.mock.callCount(), 0);
    }
    if (stage !== 'send') {
      assert.equal(send.mock.callCount(), 0);
    }
  });
}

const inbound: InboundMessage = {
  messageId: mapping.providerMessageId,
  channel: { type: CommunicationChannelType.WHATSAPP },
  providerType: CommunicationProviderType.EVOLUTION,
  from: mapping.recipient,
  body: 'Inbound unit message',
  providerInstance: 'unit',
  senderName: null,
  contentType: 'TEXT',
  attachment: null,
  conversationId: mapping.conversationId,
  receivedAt: NOW,
};
const receipt: DeliveryReceipt = {
  messageId: mapping.internalId,
  providerMessageId: mapping.providerMessageId,
  providerType: mapping.provider,
  status: DeliveryStatus.DELIVERED,
  timestamp: NOW,
  error: null,
};
const headers = { apikey: 'unit-key' };
const body = Buffer.from('{"unit": true}');
interface WebhookHarness {
  subject: InstanceType<typeof WebhookService>;
  provider: {
    verifyWebhook: Mock<(...args: unknown[]) => Promise<boolean>>;
    handleWebhook: Mock<(...args: unknown[]) => Promise<WebhookResult>>;
  };
  registry: {
    getByProviderType: Mock<(...args: unknown[]) => WebhookHarness['provider']>;
  };
  store: {
    findByProviderAndProviderMessageId: Mock<
      (...args: unknown[]) => Promise<unknown>
    >;
    updateStatus: Mock<(...args: unknown[]) => Promise<void>>;
  };
  publisher: { publish: Mock<(...args: unknown[]) => Promise<void>> };
}
function webhook(context: TestContext, result: WebhookResult): WebhookHarness {
  const provider = {
    verifyWebhook: context.mock.fn(async (..._args: unknown[]) => true),
    handleWebhook: context.mock.fn(async (..._args: unknown[]) => result),
  };
  const registry = {
    getByProviderType: context.mock.fn((..._args: unknown[]) => provider),
  };
  const store = {
    findByProviderAndProviderMessageId: context.mock.fn(
      async (..._args: unknown[]): Promise<unknown> => null,
    ),
    updateStatus: context.mock.fn(
      async (..._args: unknown[]): Promise<void> => {},
    ),
  };
  const publisher = {
    publish: context.mock.fn(async (..._args: unknown[]): Promise<void> => {}),
  };
  const subject = new WebhookService(
    registry as unknown as ConstructorParameters<typeof WebhookService>[0],
    publisher as unknown as ConstructorParameters<typeof WebhookService>[1],
    store as unknown as ConstructorParameters<typeof WebhookService>[2],
  );
  return { subject, registry, provider, store, publisher };
}
// @covers WebhookService.processWebhook
await test('webhook forwards exact authenticated bytes and emits the full inbound event', async (context) => {
  const state = webhook(context, { kind: 'inboundMessage', message: inbound });
  assert.equal(
    await state.subject.processWebhook(mapping.provider, headers, body),
    'INBOUND_MESSAGE',
  );
  assert.deepEqual(state.registry.getByProviderType.mock.calls[0]?.arguments, [
    mapping.provider,
  ]);
  assert.deepEqual(state.provider.verifyWebhook.mock.calls[0]?.arguments, [
    headers,
    body,
  ]);
  assert.deepEqual(state.provider.handleWebhook.mock.calls[0]?.arguments, [
    headers,
    body,
  ]);
  assert.deepEqual(
    state.store.findByProviderAndProviderMessageId.mock.calls[0]?.arguments,
    [mapping.provider, mapping.providerMessageId],
  );
  assert.deepEqual(state.publisher.publish.mock.calls[0]?.arguments, [
    { kind: 'InboundMessageReceived', message: inbound },
  ]);
});
await test('delivery webhook updates scoped status before publishing the exact receipt event', async (context) => {
  const state = webhook(context, { kind: 'deliveryReceipt', receipt });
  const order: string[] = [];
  state.store.findByProviderAndProviderMessageId.mock.mockImplementation(
    async () => mapping,
  );
  state.store.updateStatus.mock.mockImplementation(async () => {
    order.push('update');
  });
  state.publisher.publish.mock.mockImplementation(async () => {
    order.push('publish');
  });
  assert.equal(
    await state.subject.processWebhook(mapping.provider, headers, body),
    'DELIVERY_RECEIPT',
  );
  assert.deepEqual(state.store.updateStatus.mock.calls[0]?.arguments, [
    mapping.providerMessageId,
    DeliveryStatus.DELIVERED,
    null,
  ]);
  assert.deepEqual(state.publisher.publish.mock.calls[0]?.arguments, [
    { kind: 'MessageDelivered', receipt },
  ]);
  assert.deepEqual(order, ['update', 'publish']);
});
for (const kind of ['inbound', 'receipt'] as const) {
  for (const stage of [
    'registry',
    'verify',
    'handle',
    'lookup',
    'publish',
  ] as const) {
    await test(`${kind} webhook propagates ${stage} failure without acknowledging success`, async (context) => {
      const state = webhook(
        context,
        kind === 'inbound'
          ? { kind: 'inboundMessage', message: inbound }
          : { kind: 'deliveryReceipt', receipt },
      );
      const failure = new Error(stage);
      if (stage === 'registry') {
        state.registry.getByProviderType.mock.mockImplementation(() => {
          throw failure;
        });
      } else if (stage === 'verify') {
        state.provider.verifyWebhook.mock.mockImplementation(async () => {
          throw failure;
        });
      } else if (stage === 'handle') {
        state.provider.handleWebhook.mock.mockImplementation(async () => {
          throw failure;
        });
      } else if (stage === 'lookup') {
        state.store.findByProviderAndProviderMessageId.mock.mockImplementation(
          async () => {
            throw failure;
          },
        );
      } else {
        state.publisher.publish.mock.mockImplementation(async () => {
          throw failure;
        });
      }
      await assert.rejects(
        state.subject.processWebhook(mapping.provider, headers, body),
        (error) => error === failure,
      );
      if (stage === 'registry' || stage === 'verify') {
        assert.equal(state.provider.handleWebhook.mock.callCount(), 0);
      }
      if (stage !== 'publish') {
        assert.equal(state.publisher.publish.mock.callCount(), 0);
      }
    });
  }
}
await test('delivery status persistence failure prevents publishing a completed receipt', async (context) => {
  const state = webhook(context, { kind: 'deliveryReceipt', receipt });
  const failure = new Error('update failed');
  state.store.findByProviderAndProviderMessageId.mock.mockImplementation(
    async () => mapping,
  );
  state.store.updateStatus.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.subject.processWebhook(mapping.provider, headers, body),
    (error) => error === failure,
  );
  assert.equal(state.publisher.publish.mock.callCount(), 0);
});
