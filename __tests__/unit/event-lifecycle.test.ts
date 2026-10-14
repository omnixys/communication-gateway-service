import '../support/env.mjs';
import assert from 'node:assert/strict';
import test, { type Mock, type TestContext } from 'node:test';

const { EventLifecycle } =
  await import('../../dist/adapter/events/events.module.js');
const { ProviderLifecycle } =
  await import('../../dist/adapter/providers/provider-lifecycle.service.js');
interface Component {
  start: Mock<() => Promise<void>>;
  stop: Mock<() => Promise<void>>;
}
interface Harness {
  subject: InstanceType<typeof EventLifecycle>;
  order: string[];
  forwarder: Component;
  handler: Component;
  outbox: Component;
}
function setup(context: TestContext): Harness {
  const order: string[] = [];
  const component = (name: string): Component => ({
    start: context.mock.fn(async (): Promise<void> => {
      order.push(`${name}.start`);
    }),
    stop: context.mock.fn(async (): Promise<void> => {
      order.push(`${name}.stop`);
    }),
  });
  const forwarder = component('forwarder');
  const handler = component('handler');
  const outbox = component('outbox');
  const subject = new EventLifecycle(
    forwarder as unknown as ConstructorParameters<typeof EventLifecycle>[0],
    handler as unknown as ConstructorParameters<typeof EventLifecycle>[1],
    outbox as unknown as ConstructorParameters<typeof EventLifecycle>[2],
  );
  return { subject, order, forwarder, handler, outbox };
}
// @covers EventLifecycle.onModuleInit
await test('event lifecycle starts the forwarder, delivery handler and outbox in order', async (context) => {
  const state = setup(context);
  await state.subject.onModuleInit();
  assert.deepEqual(state.order, [
    'forwarder.start',
    'handler.start',
    'outbox.start',
  ]);
});
for (const component of ['forwarder', 'handler'] as const) {
  for (const failure of [new Error('unavailable'), 'unavailable']) {
    await test(`event startup tolerates ${component} ${typeof failure} failure and continues to the outbox`, async (context) => {
      const state = setup(context);
      state[component].start.mock.mockImplementation(async () => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- Exercise the lifecycle's explicit non-Error logging branch.
        throw failure;
      });
      await assert.doesNotReject(state.subject.onModuleInit());
      assert.equal(state.forwarder.start.mock.callCount(), 1);
      assert.equal(state.handler.start.mock.callCount(), 1);
      assert.equal(state.outbox.start.mock.callCount(), 1);
    });
  }
}
await test('event startup propagates outbox startup failure', async (context) => {
  const state = setup(context);
  const failure = new Error('outbox unavailable');
  state.outbox.start.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.subject.onModuleInit(),
    (error) => error === failure,
  );
});
// @covers EventLifecycle.onApplicationShutdown
await test('event shutdown closes forwarder, delivery handler and outbox in order', async (context) => {
  const state = setup(context);
  await state.subject.onApplicationShutdown();
  assert.deepEqual(state.order, [
    'forwarder.stop',
    'handler.stop',
    'outbox.stop',
  ]);
});
for (const component of ['forwarder', 'handler', 'outbox'] as const) {
  await test(`event shutdown preserves ${component} failure under its implemented sequential policy`, async (context) => {
    const state = setup(context);
    const failure = new Error(component);
    state[component].stop.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(
      state.subject.onApplicationShutdown(),
      (error) => error === failure,
    );
    if (component === 'forwarder') {
      assert.equal(state.handler.stop.mock.callCount(), 0);
    }
    if (component !== 'outbox') {
      assert.equal(state.outbox.stop.mock.callCount(), 0);
    }
  });
}
// @covers ProviderLifecycle.onApplicationShutdown
await test('provider shutdown closes every closable adapter and tolerates one failed close', async (context) => {
  const first = {
    providerType: 'STALWART',
    close: context.mock.fn(async (): Promise<void> => {
      throw new Error('close failed');
    }),
  };
  const second = {
    providerType: 'RESEND',
    close: context.mock.fn(async (): Promise<void> => {}),
  };
  const registry = {
    listProviders: () => [first, { providerType: 'EVOLUTION' }, second],
  };
  const subject = new ProviderLifecycle(
    registry as unknown as ConstructorParameters<typeof ProviderLifecycle>[0],
  );
  await assert.doesNotReject(subject.onApplicationShutdown());
  assert.equal(first.close.mock.callCount(), 1);
  assert.equal(second.close.mock.callCount(), 1);
});
await test('provider shutdown handles an empty registry', async () => {
  const subject = new ProviderLifecycle({
    listProviders: () => [],
  } as unknown as ConstructorParameters<typeof ProviderLifecycle>[0]);
  await assert.doesNotReject(subject.onApplicationShutdown());
});
