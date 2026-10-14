import assert from 'node:assert/strict';
import test, { mock } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DOTENV_CONFIG_PATH = '/dev/null';
process.env.DATABASE_URL =
  'postgresql://test:test@127.0.0.1:1/communication_gateway_test';
process.env.LOG_LEVEL = 'silent';

const { DefaultProviderResolver } =
  await import('../../dist/adapter/resolvers/default-provider.resolver.js');
const { DictAddressResolver } =
  await import('../../dist/adapter/resolvers/dict-address.resolver.js');
const { AddressResolutionError, NoProviderAvailableError } =
  await import('../../dist/communication-gateway/errors/gateway.errors.js');

const message = {
  id: 'message-1',
  channel: { type: 'EMAIL' },
  to: 'recipient@example.test',
  body: 'hello',
  contentType: 'text/plain',
  attachment: null,
  metadata: {},
};

function provider(type = 'RESEND', healthy = true) {
  return {
    providerType: type,
    metadata: {},
    health: mock.fn(async () => healthy),
  };
}

// @covers DefaultProviderResolver.resolve
test('returns the first healthy primary provider', async () => {
  const primary = provider('RESEND', true);
  const resolver = new DefaultProviderResolver([primary]);
  assert.equal(await resolver.resolve(message), primary);
  assert.equal(primary.health.mock.callCount(), 1);
});

test('skips unhealthy primaries and returns the next healthy one', async () => {
  const first = provider('EVOLUTION', false);
  const second = provider('RESEND', true);
  const resolver = new DefaultProviderResolver([first, second]);
  assert.equal(await resolver.resolve(message), second);
  assert.deepEqual(
    [first, second].map((value) => value.health.mock.callCount()),
    [1, 1],
  );
});

test('uses the first healthy fallback when every primary is unhealthy', async () => {
  const primary = provider('EVOLUTION', false);
  const fallback = provider('STALWART', true);
  const resolver = new DefaultProviderResolver([primary], [fallback]);
  assert.equal(await resolver.resolve(message), fallback);
  assert.equal(primary.health.mock.callCount(), 1);
  assert.equal(fallback.health.mock.callCount(), 1);
});

test('treats a throwing health probe as an unhealthy provider', async () => {
  const primary = provider('EVOLUTION', true);
  primary.health.mock.mockImplementation(async () => {
    throw new Error('probe failed');
  });
  const fallback = provider('STALWART', true);
  const resolver = new DefaultProviderResolver([primary], [fallback]);
  assert.equal(await resolver.resolve(message), fallback);
});

test('throws NoProviderAvailableError when no provider is healthy', async () => {
  const resolver = new DefaultProviderResolver(
    [provider('EVOLUTION', false)],
    [provider('STALWART', false)],
  );
  await assert.rejects(resolver.resolve(message), NoProviderAvailableError);
});

test('throws NoProviderAvailableError when no provider is registered', async () => {
  const resolver = new DefaultProviderResolver([]);
  await assert.rejects(
    resolver.resolve(message),
    (error) =>
      error instanceof NoProviderAvailableError &&
      error.channel === 'EMAIL' &&
      error.message.includes('EMAIL'),
  );
});

// @covers DictAddressResolver.resolve
test('resolves the configured address for the user and channel', async () => {
  const resolver = new DictAddressResolver({
    'user-1': {
      EMAIL: 'user-1@example.test',
      WHATSAPP: '+15551234567',
    },
  });
  assert.equal(
    await resolver.resolve('user-1', 'EMAIL'),
    'user-1@example.test',
  );
  assert.equal(await resolver.resolve('user-1', 'WHATSAPP'), '+15551234567');
});

test('normalizes case-insensitive channel keys from the mapping', async () => {
  const resolver = new DictAddressResolver({
    'user-1': { email: 'user-1@example.test', whatsapp: '+15551234567' },
  });
  assert.equal(
    await resolver.resolve('user-1', 'EMAIL'),
    'user-1@example.test',
  );
  assert.equal(await resolver.resolve('user-1', 'WHATSAPP'), '+15551234567');
});

test('rejects an unknown user with AddressResolutionError', async () => {
  const resolver = new DictAddressResolver({
    'user-1': { EMAIL: 'user-1@example.test' },
  });
  await assert.rejects(
    resolver.resolve('unknown', 'EMAIL'),
    (error) =>
      error instanceof AddressResolutionError &&
      error.userId === 'unknown' &&
      error.channel === 'EMAIL' &&
      error.message.includes('unknown'),
  );
});

test('rejects a user that has no address for the requested channel', async () => {
  const resolver = new DictAddressResolver({
    'user-1': { EMAIL: 'user-1@example.test' },
  });
  await assert.rejects(
    resolver.resolve('user-1', 'WHATSAPP'),
    (error) =>
      error instanceof AddressResolutionError &&
      error.userId === 'user-1' &&
      error.channel === 'WHATSAPP' &&
      error.message.includes('WHATSAPP'),
  );
});

// @covers DictAddressResolver.reverseLookup
test('reverse-looks-up the user for a known address', async () => {
  const resolver = new DictAddressResolver({
    'user-1': {
      EMAIL: 'user-1@example.test',
      WHATSAPP: '+15551234567',
    },
  });
  assert.equal(await resolver.reverseLookup('user-1@example.test'), 'user-1');
  assert.equal(await resolver.reverseLookup('+15551234567'), 'user-1');
});

test('returns null for an unknown address', async () => {
  const resolver = new DictAddressResolver({
    'user-1': { EMAIL: 'user-1@example.test' },
  });
  assert.equal(await resolver.reverseLookup('nobody@example.test'), null);
});

test('disambiguates addresses owned by different users', async () => {
  const resolver = new DictAddressResolver({
    'user-1': { EMAIL: 'one@example.test' },
    'user-2': { EMAIL: 'two@example.test' },
  });
  assert.equal(await resolver.reverseLookup('one@example.test'), 'user-1');
  assert.equal(await resolver.reverseLookup('two@example.test'), 'user-2');
});
