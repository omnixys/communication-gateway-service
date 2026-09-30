/**
 * @license GPL-3.0-or-later
 * Copyright (C) 2026 Caleb Gyamfi - Omnixys Technologies
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * For more information, visit <https://www.gnu.org/licenses/>.
 */

import { randomUUID } from 'node:crypto';

import type { PrismaClient } from '../prisma/generated/client.js';
import { getLogger } from '@omnixys/logger-ts';

import type { RawEventPublisher } from '../communication-gateway/models/interfaces/raw-event-publisher.port.js';

const logger = getLogger('AnalyticsOutboxWorker', 'class');

/** Attempts before a record is dead-lettered. */
const MAX_RETRIES = 10;
/** Backoff ceiling for the next attempt. */
const MAX_BACKOFF_SECONDS = 300;
/** A lock older than this is considered abandoned by a crashed instance. */
const STALE_LOCK_MS = 60_000;
/** Poll interval of the worker loop. */
const POLL_INTERVAL_MS = 1000;
/** How many records one batch claims. */
const BATCH_SIZE = 50;

type Db = PrismaClient;

/**
 * Publishes analytics facts through the transactional outbox.
 *
 * Claims use a conditional update so two instances can run the loop without
 * `SKIP LOCKED` semantics, which keeps the behaviour identical on every
 * PostgreSQL version the platform supports.
 */
export class AnalyticsOutboxWorker {
  private readonly instanceId = randomUUID();
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  /**
   * @param db outbox table, or `null` when no database is configured. Without a
   *   database there is nothing to poll, and the worker stays idle instead of
   *   failing the bootstrap of the whole gateway.
   */
  constructor(
    private readonly db: Db | null,
    private readonly producer: RawEventPublisher,
  ) {}

  /**
   * Starts the polling loop.
   *
   * The first batch runs detached: an unreachable database must not delay the
   * HTTP listener, because the readiness probe is the signal that the gateway
   * cannot serve, not a boot time out.
   */
  async start(): Promise<void> {
    if (this.producer.enabled === false || this.db === null) {
      logger.warn(
        {
          database: this.db !== null,
          broker: this.producer.enabled,
        },
        'analytics_outbox_disabled: nothing to publish or no broker configured',
      );
      return;
    }
    if (this.timer !== null) {
      return;
    }
    this.timer = setInterval(() => {
      void this.runOnce();
    }, POLL_INTERVAL_MS);
    this.timer.unref();
    void this.runOnce();
    logger.info({ batchSize: BATCH_SIZE }, 'analytics_outbox_worker_started');
  }

  /** Stops the polling loop after the in-flight batch. */
  async stop(): Promise<void> {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
    while (this.running) {
      await sleep(20);
    }
    logger.info('analytics_outbox_worker_stopped');
  }

  /**
   * Claims and publishes one batch.
   *
   * @returns the number of successfully published records.
   */
  async runOnce(): Promise<number> {
    const db = this.db;
    if (db === null) {
      return 0;
    }
    if (this.running) {
      return 0;
    }
    this.running = true;
    try {
      const claimed = await this.claim(db, BATCH_SIZE);
      let published = 0;
      for (const id of claimed) {
        if (await this.publish(db, id)) {
          published += 1;
        }
      }
      return published;
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'analytics_outbox_batch_failed',
      );
      return 0;
    } finally {
      this.running = false;
    }
  }

  private async claim(db: Db, limit: number): Promise<string[]> {
    const now = new Date();
    const staleBefore = new Date(now.getTime() - STALE_LOCK_MS);
    const candidates = await db.analyticsOutbox.findMany({
      where: {
        publishedAt: null,
        deadLetteredAt: null,
        nextAttemptAt: { lte: now },
        OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
      },
      orderBy: { createdAt: 'asc' },
      take: limit,
      select: { id: true },
    });

    const claimed: string[] = [];
    for (const candidate of candidates) {
      const result = await db.analyticsOutbox.updateMany({
        where: {
          id: candidate.id,
          OR: [{ lockedAt: null }, { lockedAt: { lt: staleBefore } }],
        },
        data: { lockedAt: now, lockedBy: this.instanceId },
      });
      if (result.count === 1) {
        claimed.push(candidate.id);
      }
    }
    return claimed;
  }

  private async publish(db: Db, id: string): Promise<boolean> {
    const record = await db.analyticsOutbox.findUnique({ where: { id } });
    if (record?.lockedBy !== this.instanceId) {
      return false;
    }

    const envelope = {
      eventId: record.id,
      eventName: record.topic,
      eventType: 'EVENT',
      eventVersion: '1',
      service: 'communication-gateway',
      timestamp: record.createdAt.toISOString(),
      payload: record.payload,
    };
    const headers: Record<string, string> = {
      'x-tenant-id': record.tenantId,
      'x-event-id': record.id,
      'x-event-version': '1',
      'x-event-type': 'EVENT',
      'x-service': 'communication-gateway',
      ...(record.correlationId === null
        ? {}
        : { 'x-correlation-id': record.correlationId }),
    };

    try {
      await this.producer.publishRaw(
        record.topic,
        JSON.stringify(envelope),
        record.id,
        headers,
      );
    } catch (error) {
      await this.releaseWithFailure(db, record.attempts + 1, record.id, error);
      return false;
    }

    await db.analyticsOutbox.update({
      where: { id: record.id },
      data: {
        publishedAt: new Date(),
        lockedAt: null,
        lockedBy: null,
        lastError: null,
      },
    });
    return true;
  }

  private async releaseWithFailure(
    db: Db,
    attempts: number,
    id: string,
    error: unknown,
  ): Promise<void> {
    const message = (
      error instanceof Error ? error.message : String(error)
    ).slice(0, 4000);
    const deadLettered = attempts >= MAX_RETRIES;
    const backoffSeconds = Math.min(MAX_BACKOFF_SECONDS, 2 ** attempts);

    await db.analyticsOutbox.update({
      where: { id },
      data: {
        attempts,
        lockedAt: null,
        lockedBy: null,
        lastError: message,
        ...(deadLettered
          ? { deadLetteredAt: new Date() }
          : {
              nextAttemptAt: new Date(Date.now() + backoffSeconds * 1000),
            }),
      },
    });
    logger.error(
      { eventId: id, attempts, deadLettered, error: message },
      'analytics_outbox_publish_failed',
    );
  }
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds).unref();
  });
}
