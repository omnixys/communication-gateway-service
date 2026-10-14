import '../support/env.mjs';
import assert from 'node:assert/strict';
import test, { mock, beforeEach } from 'node:test';

const info = mock.fn((..._args: unknown[]): void => {});
const say = mock.fn((..._args: unknown[]): void => {});
const logger = await import('@omnixys/logger-ts');
mock.module('@omnixys/logger-ts', {
  namedExports: { ...logger, getLogger: () => ({ info }) },
});
const fonts = await import('cfonts');
const { default: defaultFonts, ...fontExports } = fonts;
mock.module('cfonts', {
  namedExports: fontExports,
  defaultExport: { ...defaultFonts, say },
});
const os = await import('node:os');
const { default: _osDefault, ...osExports } = os;
const simulated = {
  ...osExports,
  type: (): string => 'UnitOS',
  release: (): string => 'unit-release',
};
mock.module('node:os', { namedExports: simulated, defaultExport: simulated });
const { BannerService } = await import('../../dist/config/banner.service.js');
const { env } = await import('../../dist/config/env.js');
beforeEach(() => {
  info.mock.resetCalls();
  say.mock.resetCalls();
});
// @covers BannerService.onApplicationBootstrap
await test('banner prints stable application and platform details through isolated fonts/logger adapters', () => {
  new BannerService().onApplicationBootstrap();
  assert.deepEqual(say.mock.calls[0]?.arguments, [
    env.SERVICE,
    {
      font: 'block',
      align: 'left',
      gradient: ['white', 'black'],
      background: 'transparent',
      letterSpacing: 1,
      lineHeight: 1,
    },
  ]);
  const messages = info.mock.calls
    .map((call) => String(call.arguments[0]))
    .join('\n');
  for (const value of [
    env.SERVICE,
    process.version,
    env.NODE_ENV,
    env.HOST,
    String(env.PORT),
    'UnitOS (unit-release)',
  ]) {
    assert.ok(messages.includes(value));
  }
});
await test('banner always masks configured API keys and passwords, including test mode', () => {
  new BannerService().onApplicationBootstrap();
  const messages = info.mock.calls
    .map((call) => String(call.arguments[0]))
    .join('\n');
  assert.match(messages, /INTERNAL_API_KEY/);
  assert.doesNotMatch(
    messages,
    /test-internal-api-key|test-evolution-key|test-chat-key|test-notification-key/,
  );
});
await test('banner rendering failure propagates before application details are logged', () => {
  const failure = new Error('render failed');
  say.mock.mockImplementationOnce(() => {
    throw failure;
  });
  assert.throws(
    () => new BannerService().onApplicationBootstrap(),
    (error) => error === failure,
  );
  assert.equal(info.mock.callCount(), 0);
});
