import '../support/env.mjs';
import { NOW } from './gateway-fixtures.ts';
import assert from 'node:assert/strict';
import test, { mock, beforeEach, type Mock, type TestContext } from 'node:test';

const spans = mock.fn((..._args: unknown[]): void => {});
const observability = await import('@omnixys/observability-ts');
mock.module('@omnixys/observability-ts', {
  namedExports: { ...observability, setupPrismaSpans: spans },
});
const { PrismaService } = await import('../../dist/prisma/prisma.service.js');
beforeEach(() => {
  spans.mock.resetCalls();
});
type Stub = Mock<(...args: unknown[]) => Promise<unknown>>;
interface Harness {
  subject: InstanceType<typeof PrismaService>;
  connect: Stub;
  disconnect: Stub;
  query: Stub;
}
function setup(context: TestContext): Harness {
  context.mock.timers.enable({ apis: ['Date', 'setTimeout'], now: NOW });
  const connect = context.mock.fn(
    async (..._args: unknown[]): Promise<void> => {},
  );
  const disconnect = context.mock.fn(
    async (..._args: unknown[]): Promise<void> => {},
  );
  const query = context.mock.fn(
    async (..._args: unknown[]): Promise<unknown> => [{ result: 1 }],
  );
  // Only the handwritten lifecycle hooks run; no generated Prisma constructor or real connection is needed.
  const subject = Object.assign(
    Object.create(PrismaService.prototype) as InstanceType<
      typeof PrismaService
    >,
    { $connect: connect, $disconnect: disconnect, $queryRaw: query },
  );
  return { subject, connect, disconnect, query };
}
// @covers PrismaService.onModuleInit
await test('Prisma startup instruments, connects and verifies SELECT 1 while clearing the check timeout', async (context) => {
  const state = setup(context);
  const clear = context.mock.method(globalThis, 'clearTimeout');
  await state.subject.onModuleInit();
  assert.equal(spans.mock.callCount(), 1);
  assert.equal(spans.mock.calls[0]?.arguments[0], state.subject);
  assert.equal(state.connect.mock.callCount(), 1);
  assert.deepEqual(
    Array.from(state.query.mock.calls[0]?.arguments[0] as TemplateStringsArray),
    ['SELECT 1'],
  );
  assert.equal(clear.mock.callCount(), 1);
});
await test('Prisma connection failure prevents the startup query', async (context) => {
  const state = setup(context);
  const failure = new Error('connect failed');
  state.connect.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.subject.onModuleInit(),
    (error) => error === failure,
  );
  assert.equal(state.query.mock.callCount(), 0);
});
await test('Prisma query failure propagates and clears its timer', async (context) => {
  const state = setup(context);
  const failure = new Error('query failed');
  const clear = context.mock.method(globalThis, 'clearTimeout');
  state.query.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.subject.onModuleInit(),
    (error) => error === failure,
  );
  assert.equal(clear.mock.callCount(), 1);
});
await test('Prisma startup fails deterministically after the five-second query deadline', async (context) => {
  const state = setup(context);
  let entered: () => void = () => {
    throw new Error('barrier not initialized');
  };
  const started = new Promise<void>((resolve) => {
    entered = resolve;
  });
  state.query.mock.mockImplementation(() => {
    entered();
    return new Promise<never>(() => {});
  });
  const startup = state.subject.onModuleInit();
  const rejected = assert.rejects(
    startup,
    /Database connection check timed out/,
  );
  await started;
  context.mock.timers.tick(5000);
  await rejected;
});
// @covers PrismaService.onModuleDestroy
await test('Prisma shutdown awaits disconnect', async (context) => {
  const state = setup(context);
  await state.subject.onModuleDestroy();
  assert.equal(state.disconnect.mock.callCount(), 1);
});
await test('Prisma shutdown preserves disconnect failure', async (context) => {
  const state = setup(context);
  const failure = new Error('disconnect failed');
  state.disconnect.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.subject.onModuleDestroy(),
    (error) => error === failure,
  );
});
