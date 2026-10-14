import type { MessageMapping as DatabaseRow } from '../../dist/prisma/generated/client.js';
import '../support/env.mjs';
import {
  ACTOR,
  DATABASE_ID,
  ORGANIZATION,
  NOW,
  mapping,
  CommunicationProviderType,
  DeliveryStatus,
} from './gateway-fixtures.ts';
import assert from 'node:assert/strict';
import test, { mock, type Mock, type TestContext } from 'node:test';

const crypto = await import('node:crypto');
mock.module('node:crypto', {
  namedExports: { ...crypto, randomUUID: () => DATABASE_ID },
  defaultExport: { ...crypto.default, randomUUID: () => DATABASE_ID },
});
const { Test } = await import('@nestjs/testing');
const { ContextAccessor } = await import('@omnixys/context-ts');
const { Prisma } = await import('../../dist/prisma/generated/client.js');
const { PrismaService } = await import('../../dist/prisma/prisma.service.js');
const { MessageMappingRepository } =
  await import('../../dist/prisma/message-mapping.repository.js');
const row: DatabaseRow = {
  ...mapping,
  metadata: { conversationId: 'unit-conversation' },
  id: DATABASE_ID,
  updatedAt: NOW,
};
type Stub = Mock<(...args: unknown[]) => Promise<unknown>>;
type Table = Record<
  'findUnique' | 'findFirst' | 'create' | 'update' | 'updateMany' | 'upsert',
  Stub
>;
interface Tx {
  messageMapping: Table;
  deliveryLog: Table;
  analyticsOutbox: Table;
}
interface Harness {
  subject: InstanceType<typeof MessageMappingRepository>;
  tx: Tx;
  prisma: Tx & {
    $transaction: Mock<
      (work: (tx: Tx) => Promise<unknown>) => Promise<unknown>
    >;
    $queryRaw: Stub;
  };
}
async function setup(context: TestContext): Promise<Harness> {
  context.mock.timers.enable({ apis: ['Date'], now: NOW });
  const stub = (): Stub =>
    context.mock.fn(async (..._args: unknown[]): Promise<unknown> => undefined);
  const table = (): Table => ({
    findUnique: stub(),
    findFirst: stub(),
    create: stub(),
    update: stub(),
    updateMany: stub(),
    upsert: stub(),
  });
  const tables = (): Tx => ({
    messageMapping: table(),
    deliveryLog: table(),
    analyticsOutbox: table(),
  });
  const tx = tables();
  const prisma = {
    ...tables(),
    $transaction: context.mock.fn(
      async (work: (tx: Tx) => Promise<unknown>): Promise<unknown> => work(tx),
    ),
    $queryRaw: stub(),
  };
  tx.messageMapping.findUnique.mock.mockImplementation(async () => row);
  const module = await Test.createTestingModule({
    providers: [
      MessageMappingRepository,
      { provide: PrismaService, useValue: prisma },
    ],
  }).compile();
  context.after(async () => {
    await module.close();
  });
  return { subject: module.get(MessageMappingRepository), tx, prisma };
}
function outbox(status: typeof mapping.status): unknown {
  const succeeded = status !== DeliveryStatus.FAILED;
  return {
    where: {
      deduplicationKey: `${ORGANIZATION}:${mapping.internalId}:${status}`,
    },
    update: {},
    create: {
      id: DATABASE_ID,
      deduplicationKey: `${ORGANIZATION}:${mapping.internalId}:${status}`,
      tenantId: ORGANIZATION,
      topic: succeeded
        ? 'communication.delivery.succeeded.v1'
        : 'communication.delivery.failed.v1',
      correlationId: 'unit-correlation',
      payload: {
        eventName: succeeded
          ? 'MessageDeliverySucceeded'
          : 'MessageDeliveryFailed',
        aggregateId: mapping.internalId,
        properties: {
          channel: mapping.channel,
          conversationId: mapping.conversationId,
          provider: mapping.provider,
          providerMessageId: mapping.providerMessageId,
          status,
        },
      },
    },
  };
}
// @covers MessageMappingRepository.save
for (const status of Object.values(DeliveryStatus)) {
  await test(`save maps all fields and ${status} fact policy in the same transaction`, async (context) => {
    const state = await setup(context);
    const input = { ...mapping, status };
    const before = structuredClone(input);
    await ContextAccessor.run({ correlationId: 'unit-correlation' }, () =>
      state.subject.save(input),
    );
    const { updatedAt: _updatedAt, ...storedFields } = input;
    assert.deepEqual(state.tx.messageMapping.create.mock.calls[0]?.arguments, [
      { data: { id: DATABASE_ID, ...storedFields } },
    ]);
    const terminal = [
      DeliveryStatus.READ,
      DeliveryStatus.DELIVERED,
      DeliveryStatus.FAILED,
    ].includes(status);
    assert.equal(
      state.tx.analyticsOutbox.upsert.mock.callCount(),
      terminal ? 1 : 0,
    );
    if (terminal) {
      assert.deepEqual(
        state.tx.analyticsOutbox.upsert.mock.calls[0]?.arguments,
        [outbox(status)],
      );
    }
    assert.equal(state.prisma.messageMapping.create.mock.callCount(), 0);
    assert.equal(state.prisma.$transaction.mock.callCount(), 1);
    assert.deepEqual(input, before);
  });
}
await test('save uses a tenant fallback and Prisma JSON null without inventing metadata', async (context) => {
  const state = await setup(context);
  await state.subject.save({ ...mapping, organizationId: '', metadata: null });
  const argument = state.tx.messageMapping.create.mock.calls[0]
    ?.arguments[0] as {
    data: { organizationId: string; tenantId: string; metadata: unknown };
  };
  assert.equal(argument.data.organizationId, ORGANIZATION);
  assert.equal(argument.data.tenantId, ORGANIZATION);
  assert.equal(argument.data.metadata, Prisma.JsonNull);
});
for (const organizationId of ['', 'invalid', ACTOR]) {
  await test(`save rejects organization ${JSON.stringify(organizationId)} under the current UUIDv4 rule`, async (context) => {
    const state = await setup(context);
    await assert.rejects(
      state.subject.save({
        ...mapping,
        organizationId,
        tenantId: organizationId,
      }),
      /Verified UUID organization/,
    );
    assert.equal(state.prisma.$transaction.mock.callCount(), 0);
  });
}
for (const stage of ['transaction', 'write', 'outbox'] as const) {
  await test(`save preserves ${stage} failure and stops later writes`, async (context) => {
    const state = await setup(context);
    const failure = new Error(stage);
    const dependency =
      stage === 'transaction'
        ? state.prisma.$transaction
        : stage === 'write'
          ? state.tx.messageMapping.create
          : state.tx.analyticsOutbox.upsert;
    dependency.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(
      state.subject.save({ ...mapping, status: DeliveryStatus.DELIVERED }),
      (error) => error === failure,
    );
    if (stage !== 'outbox') {
      assert.equal(state.tx.analyticsOutbox.upsert.mock.callCount(), 0);
    }
  });
}

// @covers MessageMappingRepository.getByProviderMessageId
// @covers MessageMappingRepository.getByInternalId
// @covers MessageMappingRepository.findByProviderAndProviderMessageId
interface ReadOperation {
  name: string;
  dependency: 'findUnique' | 'findFirst';
  arguments: unknown[];
  invoke: (subject: Harness['subject']) => Promise<unknown>;
}
const reads: ReadOperation[] = [
  {
    name: 'provider ID',
    dependency: 'findUnique',
    arguments: [{ where: { providerMessageId: mapping.providerMessageId } }],
    invoke: (s) => s.getByProviderMessageId(mapping.providerMessageId),
  },
  {
    name: 'internal ID',
    dependency: 'findUnique',
    arguments: [{ where: { internalId: mapping.internalId } }],
    invoke: (s) => s.getByInternalId(mapping.internalId),
  },
  {
    name: 'scoped provider ID',
    dependency: 'findFirst',
    arguments: [
      {
        where: {
          provider: mapping.provider,
          providerMessageId: mapping.providerMessageId,
        },
      },
    ],
    invoke: (s) =>
      s.findByProviderAndProviderMessageId(
        mapping.provider,
        mapping.providerMessageId,
      ),
  },
];
for (const operation of reads) {
  await test(`read by ${operation.name} maps a full row and forwards the exact key`, async (context) => {
    const state = await setup(context);
    state.prisma.messageMapping[operation.dependency].mock.mockImplementation(
      async () => row,
    );
    assert.deepEqual(await operation.invoke(state.subject), {
      ...mapping,
      updatedAt: NOW,
    });
    assert.deepEqual(
      state.prisma.messageMapping[operation.dependency].mock.calls[0]
        ?.arguments,
      operation.arguments,
    );
  });
  await test(`read by ${operation.name} returns null for an absent row`, async (context) => {
    const state = await setup(context);
    state.prisma.messageMapping[operation.dependency].mock.mockImplementation(
      async () => null,
    );
    assert.equal(await operation.invoke(state.subject), null);
  });
  await test(`read by ${operation.name} preserves database failure`, async (context) => {
    const state = await setup(context);
    const failure = new Error('lookup failed');
    state.prisma.messageMapping[operation.dependency].mock.mockImplementation(
      async () => {
        throw failure;
      },
    );
    await assert.rejects(
      operation.invoke(state.subject),
      (error) => error === failure,
    );
  });
  for (const metadata of [null, ['non-object'], 'string', 0]) {
    await test(`read by ${operation.name} normalizes stored enums and metadata ${JSON.stringify(metadata)}`, async (context) => {
      const state = await setup(context);
      state.prisma.messageMapping[operation.dependency].mock.mockImplementation(
        async () => ({
          ...row,
          provider: 'evolution',
          channel: 'whatsapp',
          status: 'sent',
          metadata,
        }),
      );
      assert.deepEqual(await operation.invoke(state.subject), {
        ...mapping,
        metadata: null,
        updatedAt: NOW,
      });
    });
  }
  for (const field of ['provider', 'channel', 'status'] as const) {
    await test(`read by ${operation.name} rejects unknown stored ${field}`, async (context) => {
      const state = await setup(context);
      state.prisma.messageMapping[operation.dependency].mock.mockImplementation(
        async () => ({ ...row, [field]: 'unknown-value' }),
      );
      await assert.rejects(operation.invoke(state.subject), RangeError);
    });
  }
}

// @covers MessageMappingRepository.updateStatus
for (const status of [
  DeliveryStatus.DELIVERED,
  DeliveryStatus.READ,
  DeliveryStatus.FAILED,
  DeliveryStatus.PENDING,
]) {
  await test(`updateStatus persists ${status}, fixed change time and the matching terminal fact transactionally`, async (context) => {
    const state = await setup(context);
    await ContextAccessor.run({ correlationId: 'unit-correlation' }, () =>
      state.subject.updateStatus(
        mapping.providerMessageId,
        status,
        'unit-failure',
      ),
    );
    assert.deepEqual(
      state.tx.messageMapping.findUnique.mock.calls[0]?.arguments,
      [{ where: { providerMessageId: mapping.providerMessageId } }],
    );
    assert.deepEqual(state.tx.messageMapping.update.mock.calls[0]?.arguments, [
      {
        where: { providerMessageId: mapping.providerMessageId },
        data: { status, lastError: 'unit-failure', lastStatusChange: NOW },
      },
    ]);
    if (status === DeliveryStatus.PENDING) {
      assert.equal(state.tx.analyticsOutbox.upsert.mock.callCount(), 0);
    } else {
      assert.deepEqual(
        state.tx.analyticsOutbox.upsert.mock.calls[0]?.arguments,
        [outbox(status)],
      );
    }
  });
}
await test('updateStatus defaults the error to null and ignores an absent row', async (context) => {
  const state = await setup(context);
  await state.subject.updateStatus(
    mapping.providerMessageId,
    DeliveryStatus.SENT,
  );
  assert.deepEqual(state.tx.messageMapping.update.mock.calls[0]?.arguments, [
    {
      where: { providerMessageId: mapping.providerMessageId },
      data: {
        status: DeliveryStatus.SENT,
        lastError: null,
        lastStatusChange: NOW,
      },
    },
  ]);
  state.tx.messageMapping.findUnique.mock.mockImplementation(async () => null);
  await state.subject.updateStatus('absent', DeliveryStatus.DELIVERED);
  assert.equal(state.tx.messageMapping.update.mock.callCount(), 1);
  assert.equal(state.tx.analyticsOutbox.upsert.mock.callCount(), 0);
});
for (const stage of ['transaction', 'read', 'write', 'outbox'] as const) {
  await test(`updateStatus propagates ${stage} failure`, async (context) => {
    const state = await setup(context);
    const failure = new Error(stage);
    const dependency =
      stage === 'transaction'
        ? state.prisma.$transaction
        : stage === 'read'
          ? state.tx.messageMapping.findUnique
          : stage === 'write'
            ? state.tx.messageMapping.update
            : state.tx.analyticsOutbox.upsert;
    dependency.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(
      state.subject.updateStatus(
        mapping.providerMessageId,
        DeliveryStatus.FAILED,
      ),
      (error) => error === failure,
    );
    if (stage !== 'outbox') {
      assert.equal(state.tx.analyticsOutbox.upsert.mock.callCount(), 0);
    }
  });
}

// @covers MessageMappingRepository.incrementRetry
await test('incrementRetry performs a scoped atomic increment and returns void', async (context) => {
  const state = await setup(context);
  state.prisma.messageMapping.updateMany.mock.mockImplementation(async () => ({
    count: 0,
  }));
  assert.equal(
    await state.subject.incrementRetry(mapping.internalId),
    undefined,
  );
  assert.deepEqual(
    state.prisma.messageMapping.updateMany.mock.calls[0]?.arguments,
    [
      {
        where: { internalId: mapping.internalId },
        data: { retryCount: { increment: 1 } },
      },
    ],
  );
});
await test('incrementRetry preserves database failure', async (context) => {
  const state = await setup(context);
  const failure = new Error('increment failed');
  state.prisma.messageMapping.updateMany.mock.mockImplementation(async () => {
    throw failure;
  });
  await assert.rejects(
    state.subject.incrementRetry(mapping.internalId),
    (error) => error === failure,
  );
});

// @covers MessageMappingRepository.recordFailure
for (const [errorCode, normalized] of [
  ['__ smtp 5.1 !__', 'SMTP_5_1'],
  ['!__!', 'PROVIDER_FAILURE'],
  ['x'.repeat(120), 'X'.repeat(100)],
]) {
  await test(`recordFailure sanitizes ${errorCode?.length} characters and upserts a deduplicated failure fact`, async (context) => {
    const state = await setup(context);
    const input = {
      internalId: mapping.internalId,
      provider: CommunicationProviderType.STALWART,
      channel: 'EMAIL',
      organizationId: ORGANIZATION,
      errorCode: errorCode ?? '',
    };
    await ContextAccessor.run({ correlationId: 'unit-correlation' }, () =>
      state.subject.recordFailure(input),
    );
    assert.deepEqual(state.tx.deliveryLog.create.mock.calls[0]?.arguments, [
      {
        data: {
          id: DATABASE_ID,
          messageId: mapping.internalId,
          providerType: CommunicationProviderType.STALWART,
          status: DeliveryStatus.FAILED,
          error: normalized,
          attempts: 1,
          tenantId: ORGANIZATION,
        },
      },
    ]);
    assert.deepEqual(state.tx.analyticsOutbox.upsert.mock.calls[0]?.arguments, [
      {
        where: {
          deduplicationKey: `${ORGANIZATION}:${mapping.internalId}:FAILED`,
        },
        update: {},
        create: {
          id: DATABASE_ID,
          deduplicationKey: `${ORGANIZATION}:${mapping.internalId}:FAILED`,
          tenantId: ORGANIZATION,
          topic: 'communication.delivery.failed.v1',
          correlationId: 'unit-correlation',
          payload: {
            eventName: 'MessageDeliveryFailed',
            aggregateId: mapping.internalId,
            properties: {
              channel: 'EMAIL',
              provider: CommunicationProviderType.STALWART,
              status: DeliveryStatus.FAILED,
            },
          },
        },
      },
    ]);
  });
}
await test('recordFailure rejects invalid organization before a transaction', async (context) => {
  const state = await setup(context);
  await assert.rejects(
    state.subject.recordFailure({
      internalId: mapping.internalId,
      provider: mapping.provider,
      channel: mapping.channel,
      organizationId: '',
      errorCode: 'failure',
    }),
    /Verified UUID organization/,
  );
  assert.equal(state.prisma.$transaction.mock.callCount(), 0);
});
for (const stage of ['transaction', 'log', 'outbox'] as const) {
  await test(`recordFailure propagates ${stage} failure without later writes`, async (context) => {
    const state = await setup(context);
    const failure = new Error(stage);
    const dependency =
      stage === 'transaction'
        ? state.prisma.$transaction
        : stage === 'log'
          ? state.tx.deliveryLog.create
          : state.tx.analyticsOutbox.upsert;
    dependency.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(
      state.subject.recordFailure({
        internalId: mapping.internalId,
        provider: mapping.provider,
        channel: mapping.channel,
        organizationId: ORGANIZATION,
        errorCode: 'failure',
      }),
      (error) => error === failure,
    );
    if (stage !== 'outbox') {
      assert.equal(state.tx.analyticsOutbox.upsert.mock.callCount(), 0);
    }
  });
}

// @covers MessageMappingRepository.health
for (const healthy of [true, false]) {
  await test(`health reports ${healthy} from the real SELECT 1 contract`, async (context) => {
    const state = await setup(context);
    state.prisma.$queryRaw.mock.mockImplementation(async () => {
      if (!healthy) {
        throw new Error('unavailable');
      }
      return [{ result: 1 }];
    });
    assert.equal(await state.subject.health(), healthy);
    assert.deepEqual(
      Array.from(
        state.prisma.$queryRaw.mock.calls[0]
          ?.arguments[0] as TemplateStringsArray,
      ),
      ['SELECT 1'],
    );
  });
}
