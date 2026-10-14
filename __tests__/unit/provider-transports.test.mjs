import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH = '/dev/null';
process.env.DATABASE_URL =
  'postgresql://test:test@127.0.0.1:1/communication_gateway_test';
process.env.LOG_LEVEL = 'silent';

const { ProvidersResolver } =
  await import('../../dist/communication-gateway/resolvers/providers.resolver.js');
const { ProvidersController } =
  await import('../../dist/communication-gateway/controllers/providers.controller.js');
const { HealthController } =
  await import('../../dist/health/health.controller.js');
const { BadRequestException } = await import('@nestjs/common');

function provider(type = 'EVOLUTION') {
  return {
    providerType: type,
    health: mock.fn(async () => true),
    capabilities: mock.fn(async () => ({
      supports_attachments: true,
      supports_read_receipts: true,
      supports_typing: false,
    })),
    metadata: {
      identity: {
        name: 'Fixture provider',
        version: '1',
        instance: 'fixture',
        apiVersion: 'v1',
      },
      supportsHealth: true,
      supportsWebhooks: false,
    },
  };
}

function setup(providers = [provider()]) {
  const registry = {
    listProviders: mock.fn(() => providers),
    getByProviderType: mock.fn(
      (type) => providers.find((value) => value.providerType === type) ?? null,
    ),
    isProviderEnabled: mock.fn((type) => type === 'EVOLUTION'),
  };
  return {
    registry,
    resolver: new ProvidersResolver(registry),
    controller: new ProvidersController(registry),
  };
}

// @covers ProvidersResolver.providers
test('providers maps probe results and publishes only enabled capability names', async () => {
  const { resolver } = setup();
  assert.deepEqual(await resolver.providers(), [
    {
      provider_type: 'EVOLUTION',
      connected: true,
      health: true,
      last_error: null,
      capabilities: ['attachments', 'read_receipts'],
    },
  ]);
});

test('providers tolerates failed health and capability probes independently', async () => {
  const value = provider();
  value.health.mock.mockImplementation(async () => {
    throw new Error('offline');
  });
  value.capabilities.mock.mockImplementation(async () => {
    throw new Error('unsupported');
  });
  const { resolver } = setup([value]);
  assert.deepEqual(await resolver.providers(), [
    {
      provider_type: 'EVOLUTION',
      connected: false,
      health: false,
      last_error: null,
      capabilities: [],
    },
  ]);
});

test('providers preserves an empty registry', async () => {
  assert.deepEqual(await setup([]).resolver.providers(), []);
  assert.deepEqual(setup([]).controller.list(), []);
});

// @covers ProvidersResolver.provider
test('provider normalizes the type before selecting and probing an adapter', async () => {
  const { registry, resolver } = setup();
  assert.equal(
    (await resolver.provider(' evolution ')).provider_type,
    'EVOLUTION',
  );
  assert.deepEqual(registry.getByProviderType.mock.calls[0].arguments, [
    'EVOLUTION',
  ]);
});

test('provider returns null for invalid or unregistered types without probing', async () => {
  const { registry, resolver } = setup([]);
  assert.equal(await resolver.provider('invalid'), null);
  assert.equal(registry.getByProviderType.mock.callCount(), 0);
  assert.equal(await resolver.provider('RESEND'), null);
});

// @covers ProvidersResolver.gatewayHealth
for (const [states, expected] of [
  [[], { status: 'healthy', provider_count: 0, healthy_providers: 0 }],
  [
    [true, true],
    { status: 'healthy', provider_count: 2, healthy_providers: 2 },
  ],
  [
    [true, false],
    { status: 'degraded', provider_count: 2, healthy_providers: 1 },
  ],
  [[false], { status: 'degraded', provider_count: 1, healthy_providers: 0 }],
]) {
  test(`gatewayHealth aggregates ${JSON.stringify(states)}`, async () => {
    const values = states.map((healthy) => ({
      ...provider(),
      health: async () => healthy,
    }));
    assert.deepEqual(await setup(values).resolver.gatewayHealth(), expected);
  });
}

test('gatewayHealth treats a thrown probe as unavailable', async () => {
  const value = provider();
  value.health.mock.mockImplementation(async () => {
    throw new Error('probe failed');
  });
  assert.deepEqual(await setup([value]).resolver.gatewayHealth(), {
    status: 'degraded',
    provider_count: 1,
    healthy_providers: 0,
  });
});

// @covers ProvidersController.list
test('list preserves metadata spelling and provider enablement', () => {
  const { registry, controller } = setup([provider(), provider('RESEND')]);
  assert.deepEqual(
    controller.list(),
    ['EVOLUTION', 'RESEND'].map((type) => ({
      provider_type: type,
      enabled: type === 'EVOLUTION',
      name: 'Fixture provider',
      version: '1',
      instance: 'fixture',
      api_version: 'v1',
      supports_health: true,
      supports_webhooks: false,
    })),
  );
  assert.deepEqual(
    registry.isProviderEnabled.mock.calls.map((call) => call.arguments),
    [['EVOLUTION'], ['RESEND']],
  );
});

test('list still publishes the base entry when metadata is unavailable', () => {
  const value = provider();
  Object.defineProperty(value, 'metadata', {
    get: () => {
      throw new Error('unsupported');
    },
  });
  assert.deepEqual(setup([value]).controller.list(), [
    { provider_type: 'EVOLUTION', enabled: true },
  ]);
});

// @covers ProvidersController.health
for (const healthy of [true, false]) {
  test(`health maps successful probe healthy=${healthy}`, async () => {
    const value = provider();
    value.health.mock.mockImplementation(async () => healthy);
    const { registry, controller } = setup([value]);
    assert.deepEqual(await controller.health(' evolution '), {
      status: healthy ? 'ok' : 'unavailable',
      provider: 'EVOLUTION',
    });
    assert.deepEqual(registry.getByProviderType.mock.calls[0].arguments, [
      'EVOLUTION',
    ]);
  });
}

test('health rejects unknown spelling and distinguishes missing registration', async () => {
  const { registry, controller } = setup([]);
  await assert.rejects(controller.health('invalid'), BadRequestException);
  assert.equal(registry.getByProviderType.mock.callCount(), 0);
  assert.deepEqual(await controller.health('RESEND'), {
    status: 'unknown',
    provider: 'RESEND',
    error: 'Provider RESEND not found',
  });
});

for (const [failure, expected] of [
  [
    Object.assign(new Error('not supported'), { name: 'NotImplementedError' }),
    { status: 'not_implemented', provider: 'EVOLUTION' },
  ],
  [
    new Error('offline'),
    { status: 'error', provider: 'EVOLUTION', error: 'offline' },
  ],
  [
    'offline string',
    { status: 'error', provider: 'EVOLUTION', error: 'offline string' },
  ],
]) {
  test(`health maps probe failure ${String(failure)}`, async () => {
    const value = provider();
    value.health.mock.mockImplementation(async () => {
      throw failure;
    });
    assert.deepEqual(
      await setup([value]).controller.health('EVOLUTION'),
      expected,
    );
  });
}

// @covers HealthController.live
// @covers HealthController.liveAlias
// @covers HealthController.liveness
test('all liveness aliases report the application without touching the database', () => {
  const query = mock.fn();
  const controller = new HealthController(
    { $queryRaw: query },
    { isReady: false },
  );
  for (const method of ['live', 'liveAlias', 'liveness']) {
    assert.deepEqual(controller[method](), { status: 'ok' });
  }
  assert.equal(query.mock.callCount(), 0);
});

// @covers HealthController.ready
// @covers HealthController.readiness
for (const [database, apiKey, forwarder] of [
  [true, 'fixture-only-key', true],
  [false, 'fixture-only-key', true],
  [true, '  ', true],
  [true, undefined, true],
  [true, 'fixture-only-key', false],
]) {
  test(`readiness database=${database} apiKey=${Boolean(apiKey?.trim())} forwarder=${forwarder}`, async (context) => {
    const previous = process.env.INTERNAL_API_KEY;
    context.after(() => {
      if (previous === undefined) {
        delete process.env.INTERNAL_API_KEY;
      } else {
        process.env.INTERNAL_API_KEY = previous;
      }
    });
    if (apiKey === undefined) {
      delete process.env.INTERNAL_API_KEY;
    } else {
      process.env.INTERNAL_API_KEY = apiKey;
    }
    const query = mock.fn(async () => {
      if (!database) {
        throw new Error('offline');
      }
      return [{ result: 1 }];
    });
    const reply = { status: mock.fn() };
    const controller = new HealthController(
      { $queryRaw: query },
      { isReady: forwarder },
    );
    const ready = database && Boolean(apiKey?.trim()) && forwarder;
    const expected = {
      status: ready ? 'ready' : 'not_ready',
      checks: {
        database,
        internalApiKey: Boolean(apiKey?.trim()),
        eventForwarder: forwarder,
      },
    };
    assert.deepEqual(await controller.ready(reply), expected);
    assert.deepEqual(await controller.readiness(reply), expected);
    assert.equal(reply.status.mock.callCount(), ready ? 0 : 2);
    if (!ready) {
      assert.deepEqual(reply.status.mock.calls[0].arguments, [503]);
    }
    assert.deepEqual([...query.mock.calls[0].arguments[0]], ['SELECT 1']);
  });
}
