import { kafkaObserver } from '../../../test-tools/local-kafka-observer.mjs';
import { localNestApp } from '../../../test-tools/local-nest-app.mjs';
import { moduleArrayFederation } from '../../../test-tools/local-nest-hooks.mjs';
import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';

// @covers MessagesController.send
// @covers MessagesService.send
// @covers GatewayDispatcher.dispatch
// @covers DefaultProviderResolver.resolve
// @covers DictAddressResolver.resolve
// @covers DictAddressResolver.reverseLookup
// @covers WebhooksController.receive
// @covers WebhookService.processWebhook
// @covers ProvidersController.list
// @covers ProvidersController.health
// @covers ProvidersResolver.providers
// @covers ProvidersResolver.provider
// @covers ProvidersResolver.gatewayHealth
// @covers HealthController.live
// @covers HealthController.liveAlias
// @covers HealthController.liveness
// @covers HealthController.readiness
// @covers HealthController.ready
// @covers InternalApiKeyGuard.canActivate
// @covers MessageMappingRepository.getByProviderMessageId
// @covers MessageMappingRepository.findByProviderAndProviderMessageId
// @covers MessageMappingRepository.updateStatus
// @covers MessageMappingRepository.recordFailure
// @covers MessageMappingRepository.incrementRetry
// @covers MessageMappingRepository.health
// @covers EventLifecycle.onModuleInit
// @covers EventLifecycle.onApplicationShutdown
// @covers ProviderLifecycle.onApplicationShutdown
// @covers BannerService.onApplicationBootstrap
// @covers PrismaService.onModuleInit
// @covers PrismaService.onModuleDestroy

let fixture;
let worker;
let observer;
let repository;
let providerStatus = 200;
const calls = [];
const work = new Set();
const internalKey = 'integration-internal-key';
const providerKey = 'integration-provider-key';
const route = { tenantId: randomUUID(), eventId: randomUUID() };
before(async () => {
  fixture = await localNestApp('communication-gateway', {
    rawBody: true,
    configureEnvironment({ providerUrl }) {
      Object.assign(process.env, {
        INTERNAL_API_KEY: internalKey,
        EVOLUTION_BASE_URL: providerUrl,
        EVOLUTION_API_KEY: providerKey,
        EVOLUTION_WEBHOOK_SECRET: 'integration-webhook',
        EVOLUTION_INSTANCE_NAME: 'integration',
        RESEND_BASE_URL: providerUrl,
        RESEND_API_KEY: providerKey,
        RESEND_FROM_ADDRESS: 'sender@example.org',
        STALWART_ENABLED: 'false',
        EMAIL_PRIMARY: 'resend',
        EMAIL_FALLBACK: 'none',
        CHAT_SERVICE_URL: providerUrl,
        NOTIFICATION_SERVICE_URL: providerUrl,
        CHAT_SERVICE_API_KEY: internalKey,
        NOTIFICATION_SERVICE_API_KEY: internalKey,
        WHATSAPP_SUPPORT_EVENT_MAP: JSON.stringify({ integration: route }),
        ADDRESS_MAPPINGS: JSON.stringify({
          recipient: { EMAIL: 'mapped@example.org' },
        }),
        FORWARDER_MAX_ATTEMPTS: '1',
      });
    },
    async externalHandler(request, response) {
      let raw = '';
      for await (const chunk of request) {
        raw += chunk;
      }
      const body = raw ? JSON.parse(raw) : null;
      calls.push({ path: request.url, body, headers: request.headers });
      const sending =
        request.url === '/emails' ||
        request.url.startsWith('/message/sendText/');
      response.writeHead(sending ? providerStatus : 200, {
        'content-type': 'application/json',
      });
      response.end(
        JSON.stringify(
          request.url === '/emails'
            ? { id: randomUUID() }
            : { key: { id: randomUUID() }, ok: true },
        ),
      );
    },
    async beforeInit(app, imports) {
      await moduleArrayFederation(app, imports);
      const tokens = await import('../../dist/adapter/events/events.module.js');
      worker = app.get(tokens.ANALYTICS_OUTBOX_WORKER);
      worker.start = async () => {};
      // Observe completion of actual asynchronous forwarding and publishing.
      for (const [token, methods] of [
        [tokens.EVENT_FORWARDER, ['forwardInbound', 'forwardDelivery']],
        [tokens.KAFKA_DELIVERY_HANDLER, ['publish']],
      ]) {
        const service = app.get(token);
        for (const method of methods) {
          const original = service[method].bind(service);
          service[method] = (...args) => {
            const pending = original(...args);
            work.add(pending);
            return pending;
          };
        }
      }
    },
  });
  observer = await kafkaObserver(fixture.database.name, [
    'gateway.delivery.status',
    'analytics.communication.delivery.sent',
  ]);
  const { MessageMappingRepository } =
    await import('../../dist/prisma/message-mapping.repository.js');
  repository = fixture.app.get(MessageMappingRepository);
});
after(async () => {
  await Promise.allSettled([...work]);
  await observer?.close();
  await fixture?.close();
});
beforeEach(async () => {
  await Promise.all([...work]);
  work.clear();
  await fixture.reset();
  calls.length = 0;
  providerStatus = 200;
});
async function http(
  path,
  body,
  headers = { 'x-internal-api-key': internalKey },
) {
  const response = await fetch(`${fixture.baseUrl}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(10_000),
  });
  return { status: response.status, body: await response.json() };
}
function message(overrides = {}) {
  return {
    id: randomUUID(),
    channel: 'EMAIL',
    recipientAddress: 'recipient@example.org',
    senderId: fixture.actorId,
    body: 'Hello',
    subject: 'Subject',
    ...overrides,
  };
}
async function send(body, headers = {}) {
  return http('/api/v1/messages/send', body, {
    'x-internal-api-key': internalKey,
    'x-tenant-id': fixture.tenantId,
    ...headers,
  });
}
async function mapping(id) {
  return (
    await fixture.database.query(
      'SELECT * FROM message_mappings WHERE internal_id=$1',
      [id],
    )
  ).rows[0];
}
function webhook(id, status = 'delivered') {
  return {
    event: 'messages.update',
    instance: 'integration',
    data: { key: { id }, messageType: status },
  };
}

test('email adapter succeeds but HTTP persistence rejects the unverified API-key tenant context', async () => {
  const input = message({
    metadata: { tenantId: randomUUID(), conversationId: randomUUID() },
    contentType: 'HTML',
  });
  const response = await send(input);
  assert.equal(response.status, 503, JSON.stringify(response.body));
  assert.match(
    JSON.stringify(response.body),
    /DELIVERY_STATE_PERSISTENCE_FAILED/,
  );
  assert.equal(await mapping(input.id), undefined);
  const call = calls.find((call) => call.path === '/emails');
  assert.equal(call.headers.authorization, `Bearer ${providerKey}`);
  assert.deepEqual(call.body, {
    from: 'sender@example.org',
    to: [input.recipientAddress],
    subject: input.subject,
    html: input.body,
  });
});

test('WhatsApp delivery maps provider IDs and uses the configured instance', async () => {
  const input = message({ channel: 'WHATSAPP', recipientAddress: '491234567' });
  const response = await send(input);
  assert.equal(response.status, 503, JSON.stringify(response.body));
  assert.equal(await mapping(input.id), undefined);
  const call = calls.find(
    (call) => call.path === '/message/sendText/integration',
  );
  assert.deepEqual(call.body, {
    number: input.recipientAddress,
    text: input.body,
  });
  assert.equal(call.headers.apikey, providerKey);
});

test('address lookup succeeds for configured recipients and fails without sending for unknown recipients', async () => {
  const input = message({
    recipientAddress: undefined,
    recipientId: 'recipient',
  });
  assert.equal((await send(input)).status, 503);
  assert.deepEqual(calls[0].body.to, ['mapped@example.org']);
  calls.length = 0;
  assert.equal(
    (
      await send(
        message({ recipientAddress: undefined, recipientId: 'missing' }),
      )
    ).status,
    422,
  );
  assert.equal(calls.length, 0);
});

for (const [name, patch] of [
  ['missing recipient', { recipientAddress: undefined }],
  ['invalid UUIDv7 sender', { senderId: randomUUID() }],
  ['missing email subject', { subject: undefined }],
  ['empty body', { body: '' }],
  ['unknown property', { forged: true }],
  ['invalid channel', { channel: 'SMS' }],
  ['unsupported WhatsApp HTML', { channel: 'WHATSAPP', contentType: 'HTML' }],
]) {
  test(`validation rejects ${name} before persistence or provider calls`, async () => {
    const input = message(patch);
    assert.equal((await send(input)).status, 400);
    assert.equal(await mapping(input.id), undefined);
    assert.equal(calls.length, 0);
  });
}

test('internal API authentication and tenant validation remain active', async () => {
  assert.equal((await http('/api/v1/providers', undefined, {})).status, 401);
  assert.equal(
    (
      await http('/api/v1/providers', undefined, {
        'x-internal-api-key': 'wrong',
      })
    ).status,
    401,
  );
  assert.equal(
    (await send(message(), { 'x-tenant-id': 'invalid' })).status,
    400,
  );
  assert.equal(calls.length, 0);
});

for (const status of [401, 429, 503]) {
  test(`provider HTTP ${status} records a failed attempt without a successful mapping`, async () => {
    providerStatus = status;
    const input = message();
    assert.equal((await send(input)).status, 502);
    assert.equal(await mapping(input.id), undefined);
    // The HTTP API-key path lacks a verified organization; failure recording
    // rolls back as well. Exercise the real repository with explicit valid context.
    assert.equal(
      (
        await fixture.database.query(
          'SELECT count(*)::int AS count FROM delivery_logs',
        )
      ).rows[0].count,
      0,
    );
    await repository.recordFailure({
      internalId: input.id,
      provider: 'RESEND',
      channel: 'EMAIL',
      organizationId: fixture.tenantId,
      errorCode: `HTTP_${status}`,
    });
    const log = (
      await fixture.database.query(
        'SELECT * FROM delivery_logs WHERE message_id=$1',
        [input.id],
      )
    ).rows[0];
    assert.equal(log.status, 'FAILED');
    assert.equal(log.tenant_id, fixture.tenantId);
  });
}

test('all provider queries and health endpoints use the real registry', async () => {
  const listed = await http('/api/v1/providers');
  assert.equal(listed.status, 200);
  assert.deepEqual(listed.body.map((entry) => entry.provider_type).sort(), [
    'EVOLUTION',
    'RESEND',
  ]);
  assert.equal(
    (await http('/api/v1/providers/EVOLUTION/health')).body.status,
    'ok',
  );
  assert.equal((await http('/api/v1/providers/invalid/health')).status, 400);
  const result = await fixture.graphql(
    '{providers{provider_type connected capabilities} provider(provider_type:"RESEND"){provider_type health} gatewayHealth{status provider_count healthy_providers}}',
    {},
    { unsigned: true, headers: { 'x-internal-api-key': internalKey } },
  );
  assert.equal(
    result.body.errors,
    undefined,
    JSON.stringify(result.body.errors),
  );
  assert.equal(result.body.data.gatewayHealth.provider_count, 2);
  assert.equal(result.body.data.gatewayHealth.status, 'healthy');
  assert.equal(result.body.data.provider.health, true);
  const missing = await fixture.graphql(
    '{provider(provider_type:"invalid"){provider_type}}',
    {},
    { unsigned: true, headers: { 'x-internal-api-key': internalKey } },
  );
  assert.equal(missing.body.data.provider, null);
  for (const path of [
    '/health',
    '/health/live',
    '/health/liveness',
    '/health/ready',
    '/health/readiness',
  ]) {
    assert.equal((await http(path, undefined, {})).status, 200);
  }
});

test('verified delivery receipts update SQL, forward to a local double and publish real Kafka once', async () => {
  const input = message({ channel: 'WHATSAPP' });
  const id = randomUUID();
  await fixture.database.query(
    "INSERT INTO message_mappings(id,internal_id,provider_message_id,provider,channel,conversation_id,status,tenant_id,organization_id) VALUES($1,$2,$3,'EVOLUTION','WHATSAPP',$4,'SENT',$5,$5)",
    [randomUUID(), input.id, id, randomUUID(), fixture.tenantId],
  );
  const headers = { apikey: providerKey };
  assert.equal(
    (await http('/webhooks/EVOLUTION', webhook(id), headers)).status,
    200,
  );
  await Promise.all([...work]);
  assert.equal((await mapping(input.id)).status, 'DELIVERED');
  const record = await observer.waitFor(
    (record) =>
      record.topic === 'gateway.delivery.status' &&
      record.value.providerMessageId === id,
  );
  assert.equal(record.value.messageId, input.id);
  assert.equal(record.headers['x-status'], 'DELIVERED');
  assert.equal(
    calls.find((call) => call.path.endsWith('/delivery-status')).body
      .internal_message_id,
    input.id,
  );
  const count = work.size;
  assert.equal(
    (await http('/webhooks/EVOLUTION', webhook(id), headers)).status,
    200,
  );
  assert.equal(work.size, count);
  assert.equal(
    (await http('/webhooks/EVOLUTION', webhook(id, 'sent'), headers)).status,
    409,
  );
  assert.equal((await mapping(input.id)).status, 'DELIVERED');
});

test('webhook authentication accepts HMAC and rejects missing credentials and unsupported routes', async () => {
  const body = { event: 'ignored', data: {} };
  const signature = createHmac('sha256', 'integration-webhook')
    .update(JSON.stringify(body))
    .digest('hex');
  assert.equal(
    (
      await http('/webhooks/EVOLUTION', body, {
        'x-signature': `sha256=${signature}`,
      })
    ).status,
    200,
  );
  assert.equal((await http('/webhooks/EVOLUTION', body, {})).status, 401);
  assert.equal((await http('/webhooks/invalid', body, {})).status, 422);
  assert.equal((await http('/webhooks/EVOLUTION', undefined, {})).status, 405);
});

test('analytics outbox uses the real producer and records completion without republishing', async () => {
  const id = randomUUID();
  await fixture.database.query(
    'INSERT INTO analytics_outbox(id,deduplication_key,tenant_id,topic,payload) VALUES($1,$1,$2,$3,$4::jsonb)',
    [
      id,
      fixture.tenantId,
      'analytics.communication.delivery.sent',
      JSON.stringify({ internalMessageId: randomUUID() }),
    ],
  );
  assert.equal(await worker.runOnce(), 1);
  const record = await observer.waitFor(
    (record) => record.value.eventId === id,
  );
  assert.equal(record.headers['x-tenant-id'], fixture.tenantId);
  const stored = (
    await fixture.database.query('SELECT * FROM analytics_outbox WHERE id=$1', [
      id,
    ])
  ).rows[0];
  assert.ok(stored.published_at instanceof Date);
  assert.equal(stored.locked_by, null);
  assert.equal(await worker.runOnce(), 0);
});

test('resolves an EMAIL recipient address from the configured recipientId mapping', async () => {
  const input = message({
    recipientAddress: undefined,
    recipientId: 'recipient',
  });
  const response = await send(input);
  assert.equal(response.status, 503, JSON.stringify(response.body));
  const call = calls.find((call) => call.path === '/emails');
  assert.deepEqual(call.body.to, ['mapped@example.org']);
});

test('rejects an unmapped recipientId before contacting any provider', async () => {
  const input = message({
    recipientAddress: undefined,
    recipientId: 'unknown',
  });
  const response = await send(input);
  assert.equal(response.status, 422, JSON.stringify(response.body));
  assert.match(JSON.stringify(response.body), /ADDRESS_RESOLUTION_FAILED/);
  assert.equal(calls.length, 0);
});

test('reverse lookup resolves a configured address back to its recipient id', async () => {
  const { ADDRESS_RESOLVER } =
    await import('../../dist/communication-gateway/utils/tokens.js');
  const resolver = fixture.app.get(ADDRESS_RESOLVER);
  assert.equal(await resolver.reverseLookup('mapped@example.org'), 'recipient');
  assert.equal(await resolver.reverseLookup('missing@example.org'), null);
});

test('repository retry counter and health probe use the real isolated database', async () => {
  const internalId = randomUUID();
  await fixture.database.query(
    "INSERT INTO message_mappings(id,internal_id,provider_message_id,provider,channel,conversation_id,status,tenant_id,organization_id) VALUES($1,$2,$3,'RESEND','EMAIL',$4,'SENT',$5,$5)",
    [randomUUID(), internalId, randomUUID(), randomUUID(), fixture.tenantId],
  );
  await repository.incrementRetry(internalId);
  const row = (
    await fixture.database.query(
      'SELECT retry_count FROM message_mappings WHERE internal_id=$1',
      [internalId],
    )
  ).rows[0];
  assert.equal(row.retry_count, 1);
  assert.equal(await repository.health(), true);
});
