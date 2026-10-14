import '../support/env.mjs';
import {
  ORGANIZATION,
  dto,
  response,
  CommunicationProviderType,
} from './gateway-fixtures.ts';
import type { ExecutionContext } from '@nestjs/common';
import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';

const { Test } = await import('@nestjs/testing');
const {
  BadRequestException,
  UnauthorizedException,
  ServiceUnavailableException,
  UnprocessableEntityException,
  MethodNotAllowedException,
} = await import('@nestjs/common');
const { Reflector } = await import('@nestjs/core');
const { ExecutionContextHost } =
  await import('@nestjs/core/helpers/execution-context-host.js');
const { MessagesController } =
  await import('../../dist/communication-gateway/controllers/messages.controller.js');
const { MessagesService } =
  await import('../../dist/communication-gateway/services/messages.service.js');
const { WebhooksController } =
  await import('../../dist/communication-gateway/controllers/webhooks.controller.js');
const { WEBHOOK_SERVICE } =
  await import('../../dist/communication-gateway/utils/tokens.js');
const { WebhookVerificationError } =
  await import('../../dist/communication-gateway/errors/gateway.errors.js');
const { InternalApiKeyGuard } =
  await import('../../dist/security/internal-api-key.guard.js');
const { IS_PUBLIC_KEY } =
  await import('../../dist/security/public.decorator.js');

async function transports(context: TestContext): Promise<{
  messages: InstanceType<typeof MessagesController>;
  webhooks: InstanceType<typeof WebhooksController>;
  send: ReturnType<TestContext['mock']['fn']>;
  processWebhook: ReturnType<TestContext['mock']['fn']>;
}> {
  const send = context.mock.fn(
    async (..._args: unknown[]): Promise<unknown> => ({
      ...response,
      raw: undefined,
    }),
  );
  const processWebhook = context.mock.fn(
    async (..._args: unknown[]): Promise<unknown> => 'INBOUND_MESSAGE',
  );
  const module = await Test.createTestingModule({
    providers: [
      MessagesController,
      WebhooksController,
      { provide: MessagesService, useValue: { send } },
      { provide: WEBHOOK_SERVICE, useValue: { processWebhook } },
    ],
  }).compile();
  context.after(async () => {
    await module.close();
  });
  return {
    messages: module.get(MessagesController),
    webhooks: module.get(WebhooksController),
    send,
    processWebhook,
  };
}
// @covers MessagesController.send
for (const tenant of [
  ORGANIZATION,
  ORGANIZATION.toUpperCase(),
  undefined,
  '',
]) {
  await test(`send controller forwards the DTO for tenant ${JSON.stringify(tenant)}`, async (context) => {
    const state = await transports(context);
    assert.deepEqual(await state.messages.send(dto, tenant), {
      ...response,
      raw: undefined,
    });
    assert.deepEqual(state.send.mock.calls[0]?.arguments, [dto]);
    assert.equal(state.send.mock.callCount(), 1);
  });
}
for (const tenant of ['invalid', ` ${ORGANIZATION} `]) {
  await test(`send controller rejects malformed tenant ${JSON.stringify(tenant)} before the service`, async (context) => {
    const state = await transports(context);
    await assert.rejects(state.messages.send(dto, tenant), BadRequestException);
    assert.equal(state.send.mock.callCount(), 0);
  });
}
await test('send controller preserves service failure', async (context) => {
  const state = await transports(context);
  const failure = new Error('send failed');
  state.send.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(state.messages.send(dto), (error) => error === failure);
});

function rawRequest(
  rawBody?: Buffer,
): Parameters<InstanceType<typeof WebhooksController>['receive']>[2] {
  const request = { rawBody };
  return request as Parameters<
    InstanceType<typeof WebhooksController>['receive']
  >[2];
}

// @covers WebhooksController.receive
for (const outcome of ['INBOUND_MESSAGE', 'DELIVERY_RECEIPT', 'IGNORED']) {
  await test(`webhook receive returns ${outcome} after normalizing provider/header names and forwarding exact bytes`, async (context) => {
    const state = await transports(context);
    const body = Buffer.from('{"notReencoded":  1}');
    const headers = {
      ApiKey: 'unit-key',
      'X-Hub-Signature-256': 'unit-signature',
    };
    state.processWebhook.mock.mockImplementation(async () => outcome);
    const request = rawRequest(body);
    assert.deepEqual(
      await state.webhooks.receive(' evolution ', headers, request),
      { received: true, result: outcome },
    );
    assert.deepEqual(state.processWebhook.mock.calls[0]?.arguments, [
      CommunicationProviderType.EVOLUTION,
      { apikey: 'unit-key', 'x-hub-signature-256': 'unit-signature' },
      body,
    ]);
    assert.deepEqual(headers, {
      ApiKey: 'unit-key',
      'X-Hub-Signature-256': 'unit-signature',
    });
  });
}
await test('webhook receive rejects an unknown provider before invoking the service', async (context) => {
  const state = await transports(context);
  await assert.rejects(
    state.webhooks.receive('unsupported', {}, rawRequest(Buffer.alloc(0))),
    UnprocessableEntityException,
  );
  assert.equal(state.processWebhook.mock.callCount(), 0);
});
await test('webhook receive rejects an absent raw body before invoking the verifier', async (context) => {
  const state = await transports(context);
  await assert.rejects(
    state.webhooks.receive('EVOLUTION', {}, rawRequest()),
    BadRequestException,
  );
  assert.equal(state.processWebhook.mock.callCount(), 0);
});
await test('webhook receive maps verification failure to 401', async (context) => {
  const state = await transports(context);
  state.processWebhook.mock.mockImplementation(async () => {
    throw new WebhookVerificationError(CommunicationProviderType.EVOLUTION);
  });
  await assert.rejects(
    state.webhooks.receive('EVOLUTION', {}, rawRequest(Buffer.alloc(0))),
    UnauthorizedException,
  );
});
await test('webhook receive preserves other service failures', async (context) => {
  const state = await transports(context);
  const failure = new Error('webhook processing failed');
  state.processWebhook.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.webhooks.receive('EVOLUTION', {}, rawRequest(Buffer.alloc(0))),
    (error) => error === failure,
  );
});
// @covers WebhooksController.challenge
await test('webhook challenge always rejects the unsupported verification route with 405', async (context) => {
  const state = await transports(context);
  assert.throws(() => state.webhooks.challenge(), MethodNotAllowedException);
  assert.equal(state.processWebhook.mock.callCount(), 0);
});

class GuardFixture {}
const handler = (): void => {};
function requestContext(
  transport: string,
  request: unknown,
  carrier: 'request' | 'req' = 'request',
): ExecutionContext {
  const host = new ExecutionContextHost(
    transport === 'graphql' ? [{}, {}, { [carrier]: request }, {}] : [request],
    GuardFixture,
    handler,
  );
  host.setType(transport);
  return host;
}
async function guard(
  context: TestContext,
  isPublic = false,
): Promise<{
  subject: InstanceType<typeof InternalApiKeyGuard>;
  metadata: ReturnType<TestContext['mock']['fn']>;
}> {
  const previous = process.env.INTERNAL_API_KEY;
  process.env.INTERNAL_API_KEY = 'unit-internal-key';
  context.after(() => {
    if (previous === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = previous;
    }
  });
  const metadata = context.mock.fn(() => isPublic);
  const module = await Test.createTestingModule({
    providers: [
      InternalApiKeyGuard,
      { provide: Reflector, useValue: { getAllAndOverride: metadata } },
    ],
  }).compile();
  context.after(async () => {
    await module.close();
  });
  return { subject: module.get(InternalApiKeyGuard), metadata };
}
// @covers InternalApiKeyGuard.canActivate
await test('public guard bypass checks handler/class metadata before requiring any configuration', async (context) => {
  const state = await guard(context, true);
  delete process.env.INTERNAL_API_KEY;
  assert.equal(
    state.subject.canActivate(requestContext('http', undefined)),
    true,
  );
  assert.deepEqual(state.metadata.mock.calls[0]?.arguments, [
    IS_PUBLIC_KEY,
    [handler, GuardFixture],
  ]);
});
for (const key of [undefined, '', '  ']) {
  await test(`private guard fails closed for configuration ${JSON.stringify(key)}`, async (context) => {
    const state = await guard(context);
    if (key === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = key;
    }
    assert.throws(
      () => state.subject.canActivate(requestContext('http', { headers: {} })),
      ServiceUnavailableException,
    );
  });
}
for (const [transport, carrier] of [
  ['http', 'request'],
  ['graphql', 'request'],
  ['graphql', 'req'],
] as const) {
  await test(`private guard accepts an exact key via ${transport}/${carrier}`, async (context) => {
    const state = await guard(context);
    process.env.INTERNAL_API_KEY = ' unit-internal-key ';
    assert.equal(
      state.subject.canActivate(
        requestContext(
          transport,
          { headers: { 'x-internal-api-key': 'unit-internal-key' } },
          carrier,
        ),
      ),
      true,
    );
  });
  for (const [name, request] of [
    ['missing request', undefined],
    ['missing headers', {}],
    ['missing key', { headers: {} }],
    ['different byte length', { headers: { 'x-internal-api-key': 'é' } }],
    [
      'same length wrong key',
      { headers: { 'x-internal-api-key': 'unit-internal-bad' } },
    ],
    [
      'untrimmed key',
      { headers: { 'x-internal-api-key': ' unit-internal-key ' } },
    ],
  ] as const) {
    await test(`private guard rejects ${name} via ${transport}/${carrier}`, async (context) => {
      const state = await guard(context);
      assert.throws(
        () =>
          state.subject.canActivate(
            requestContext(transport, request, carrier),
          ),
        UnauthorizedException,
      );
    });
  }
}
for (const [keys, accepted] of [
  [['unit-internal-key', 'invalid'], true],
  [['invalid', 'unit-internal-key'], false],
  [[], false],
] as const) {
  await test(`guard uses only the first header value from ${JSON.stringify(keys)}`, async (context) => {
    const state = await guard(context);
    const scope = requestContext('http', {
      headers: { 'x-internal-api-key': keys },
      method: 'POST',
      originalUrl: '/api/v1/messages/send',
    });
    if (accepted) {
      assert.equal(state.subject.canActivate(scope), true);
    } else {
      assert.throws(
        () => state.subject.canActivate(scope),
        UnauthorizedException,
      );
    }
  });
}
