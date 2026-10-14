import type { SendMessageDto } from '../../dist/communication-gateway/models/dto/send-message.dto.js';
import type { ProviderResponse } from '../../dist/communication-gateway/models/payloads/provider-response.model.js';
import '../support/env.mjs';
import {
  ACTOR,
  NOW,
  ORGANIZATION,
  dto,
  mapping,
  response,
  CommunicationChannelType,
  CommunicationProviderType,
  DeliveryStatus,
} from './gateway-fixtures.ts';
import assert from 'node:assert/strict';
import test, { type Mock, type TestContext } from 'node:test';

const { Test } = await import('@nestjs/testing');
const { ContextAccessor } = await import('@omnixys/context-ts');
const {
  BadGatewayException,
  BadRequestException,
  GatewayTimeoutException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} = await import('@nestjs/common');
const { MessagesService } =
  await import('../../dist/communication-gateway/services/messages.service.js');
const { GatewayDispatcher } =
  await import('../../dist/communication-gateway/services/gateway-dispatcher.service.js');
const { MESSAGE_MAPPING_STORE } = await import('../../dist/prisma/tokens.js');
const { ADDRESS_RESOLVER } =
  await import('../../dist/communication-gateway/utils/tokens.js');
type Stub = Mock<(...args: unknown[]) => Promise<unknown>>;
interface Harness {
  subject: InstanceType<typeof MessagesService>;
  dispatcher: {
    dispatch: Mock<(...args: unknown[]) => Promise<ProviderResponse>>;
  };
  store: { save: Stub; recordFailure: Stub };
  address: { resolve: Stub };
}
async function setup(context: TestContext): Promise<Harness> {
  context.mock.timers.enable({ apis: ['Date'], now: NOW });
  const dispatcher = {
    dispatch: context.mock.fn(
      async (..._args: unknown[]): Promise<ProviderResponse> => response,
    ),
  };
  const store = {
    save: context.mock.fn(async (..._args: unknown[]): Promise<void> => {}),
    recordFailure: context.mock.fn(
      async (..._args: unknown[]): Promise<void> => {},
    ),
  };
  const address = {
    resolve: context.mock.fn(
      async (..._args: unknown[]): Promise<string> => mapping.recipient,
    ),
  };
  const module = await Test.createTestingModule({
    providers: [
      MessagesService,
      { provide: GatewayDispatcher, useValue: dispatcher },
      { provide: MESSAGE_MAPPING_STORE, useValue: store },
      { provide: ADDRESS_RESOLVER, useValue: address },
    ],
  }).compile();
  context.after(async () => {
    await module.close();
  });
  return { subject: module.get(MessagesService), dispatcher, store, address };
}
// @covers MessagesService.send
await test('send resolves the recipient, replaces spoofed metadata with the context tenant and saves the delivery mapping', async (context) => {
  const state = await setup(context);
  const input = {
    ...dto,
    metadata: {
      tenantId: 'spoofed',
      conversationId: 'conversation',
      providerInstance: 'instance',
    },
  };
  const before = structuredClone(input);
  const result = await ContextAccessor.run({ tenantId: ORGANIZATION }, () =>
    state.subject.send(input),
  );
  assert.deepEqual(result, {
    success: true,
    providerMessageId: mapping.providerMessageId,
    status: DeliveryStatus.SENT,
    error: null,
    providerIdentity: response.providerIdentity,
  });
  const metadata = {
    conversationId: 'conversation',
    providerInstance: 'instance',
    tenantId: ORGANIZATION,
  };
  assert.deepEqual(state.address.resolve.mock.calls[0]?.arguments, [
    ACTOR,
    CommunicationChannelType.WHATSAPP,
  ]);
  assert.deepEqual(state.dispatcher.dispatch.mock.calls[0]?.arguments, [
    {
      id: dto.id,
      channel: { type: CommunicationChannelType.WHATSAPP },
      to: mapping.recipient,
      body: dto.body,
      contentType: 'TEXT',
      attachment: null,
      metadata,
    },
    { tenantId: ORGANIZATION, deploymentId: null, metadata },
  ]);
  assert.deepEqual(state.store.save.mock.calls[0]?.arguments, [
    {
      ...mapping,
      conversationId: 'conversation',
      providerInstance: 'instance',
      metadata,
    },
  ]);
  assert.deepEqual(input, before);
});
await test('send maps email HTML, subject and sender address and skips resolution for an explicit recipient', async (context) => {
  const state = await setup(context);
  state.dispatcher.dispatch.mock.mockImplementation(async () => ({
    ...response,
    providerIdentity: null,
  }));
  const input: SendMessageDto = {
    ...dto,
    channel: 'EMAIL',
    recipientAddress: 'recipient@example.test',
    contentType: 'HTML',
    subject: 'Unit subject',
    senderAddress: 'sender@example.test',
  };
  const result = await state.subject.send(input);
  assert.equal(result.providerIdentity, null);
  assert.equal(state.address.resolve.mock.callCount(), 0);
  const metadata = {
    subject: 'Unit subject',
    senderAddress: 'sender@example.test',
  };
  assert.deepEqual(state.dispatcher.dispatch.mock.calls[0]?.arguments, [
    {
      id: dto.id,
      channel: { type: CommunicationChannelType.EMAIL },
      to: input.recipientAddress,
      body: dto.body,
      contentType: 'HTML',
      attachment: null,
      metadata,
    },
    { tenantId: null, deploymentId: null, metadata },
  ]);
  assert.deepEqual(state.store.save.mock.calls[0]?.arguments, [
    {
      ...mapping,
      provider: CommunicationProviderType.RESEND,
      channel: CommunicationChannelType.EMAIL,
      recipient: input.recipientAddress,
      conversationId: '',
      providerInstance: '',
      tenantId: '',
      organizationId: '',
      metadata,
    },
  ]);
});
await test('send removes an untrusted tenant without context and defaults omitted sender and metadata strings', async (context) => {
  const state = await setup(context);
  state.dispatcher.dispatch.mock.mockImplementation(async () => ({
    ...response,
    providerIdentity: null,
  }));
  await state.subject.send({
    ...dto,
    senderId: undefined,
    metadata: {
      tenantId: 'spoofed',
      conversationId: 42,
      providerInstance: false,
    },
  });
  assert.deepEqual(state.store.save.mock.calls[0]?.arguments, [
    {
      ...mapping,
      sender: '',
      conversationId: '',
      providerInstance: '',
      tenantId: '',
      organizationId: '',
      metadata: { conversationId: 42, providerInstance: false },
    },
  ]);
});
for (const [name, patch, error] of [
  ['missing recipient', { recipientId: undefined }, BadRequestException],
  [
    'empty recipient',
    { recipientId: '', recipientAddress: '' },
    BadRequestException,
  ],
  ['missing email subject', { channel: 'EMAIL' }, BadRequestException],
  [
    'empty email subject',
    { channel: 'EMAIL', subject: '' },
    BadRequestException,
  ],
  ['HTML WhatsApp', { contentType: 'HTML' }, BadRequestException],
  ['unknown channel', { channel: 'unsupported' }, RangeError],
] as const) {
  await test(`send rejects ${name} before resolving or dispatching`, async (context) => {
    const state = await setup(context);
    const input = { ...dto, ...patch };
    await assert.rejects(state.subject.send(input as SendMessageDto), error);
    assert.equal(state.address.resolve.mock.callCount(), 0);
    assert.equal(state.dispatcher.dispatch.mock.callCount(), 0);
    assert.equal(state.store.save.mock.callCount(), 0);
  });
}
await test('send rejects an invalid context tenant before dispatch or persistence', async (context) => {
  const state = await setup(context);
  await assert.rejects(
    async () =>
      ContextAccessor.run({ tenantId: 'invalid' }, () =>
        state.subject.send(dto),
      ),
    BadRequestException,
  );
  assert.equal(state.dispatcher.dispatch.mock.callCount(), 0);
  assert.equal(state.store.save.mock.callCount(), 0);
});
for (const failure of [new Error('lookup failed'), 'lookup failed']) {
  await test(`send maps address lookup failure ${typeof failure} to 422`, async (context) => {
    const state = await setup(context);
    state.address.resolve.mock.mockImplementation(async () => {
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- Exercise address failures that are not Error instances.
      throw failure;
    });
    await assert.rejects(state.subject.send(dto), (error: unknown) => {
      assert.ok(error instanceof UnprocessableEntityException);
      assert.deepEqual(error.getResponse(), {
        message: 'lookup failed',
        error: 'ADDRESS_RESOLUTION_FAILED',
      });
      return true;
    });
    assert.equal(state.dispatcher.dispatch.mock.callCount(), 0);
  });
}
for (const errorCode of ['provider timeout', 'delivery failed', null]) {
  await test(`send records provider failure ${String(errorCode)} then maps its response`, async (context) => {
    const state = await setup(context);
    state.dispatcher.dispatch.mock.mockImplementation(async () => ({
      ...response,
      success: false,
      error: errorCode,
    }));
    await assert.rejects(
      async () =>
        ContextAccessor.run({ tenantId: ORGANIZATION }, () =>
          state.subject.send(dto),
        ),
      errorCode === 'provider timeout'
        ? GatewayTimeoutException
        : BadGatewayException,
    );
    assert.deepEqual(state.store.recordFailure.mock.calls[0]?.arguments, [
      {
        internalId: dto.id,
        provider: CommunicationProviderType.EVOLUTION,
        channel: CommunicationChannelType.WHATSAPP,
        organizationId: ORGANIZATION,
        errorCode: errorCode ?? 'PROVIDER_FAILURE',
      },
    ]);
    assert.equal(state.store.save.mock.callCount(), 0);
  });
}
await test('failure audit persistence does not replace the original provider timeout', async (context) => {
  const state = await setup(context);
  state.dispatcher.dispatch.mock.mockImplementation(async () => ({
    ...response,
    success: false,
    providerIdentity: null,
    error: 'TIMEOUT',
  }));
  state.store.recordFailure.mock.mockImplementation(async () => {
    throw new Error('audit failed');
  });
  await assert.rejects(state.subject.send(dto), GatewayTimeoutException);
  assert.equal(state.store.save.mock.callCount(), 0);
});
await test('dispatch rejection propagates without creating success or failure records', async (context) => {
  const state = await setup(context);
  const failure = new Error('dispatch unavailable');
  state.dispatcher.dispatch.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(state.subject.send(dto), (error) => error === failure);
  assert.equal(state.store.save.mock.callCount(), 0);
  assert.equal(state.store.recordFailure.mock.callCount(), 0);
});
await test('success mapping persistence failure is a 503 rather than a successful response', async (context) => {
  const state = await setup(context);
  state.store.save.mock.mockImplementation(async () => {
    throw new Error('database unavailable');
  });
  await assert.rejects(state.subject.send(dto), (error: unknown) => {
    assert.ok(error instanceof ServiceUnavailableException);
    assert.match(
      String((error.getResponse() as { message: string }).message),
      /DELIVERY_STATE_PERSISTENCE_FAILED/,
    );
    return true;
  });
});
for (const providerMessageId of [null, '']) {
  await test(`successful send with ${JSON.stringify(providerMessageId)} provider ID does not create a mapping`, async (context) => {
    const state = await setup(context);
    state.dispatcher.dispatch.mock.mockImplementation(async () => ({
      ...response,
      providerMessageId,
    }));
    assert.equal(
      (await state.subject.send(dto)).providerMessageId,
      providerMessageId,
    );
    assert.equal(state.store.save.mock.callCount(), 0);
  });
}
