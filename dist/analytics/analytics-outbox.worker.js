import { randomUUID } from 'node:crypto';
import { getLogger } from '@omnixys/logger-ts';
const logger = getLogger('AnalyticsOutboxWorker', 'class');
const MAX_RETRIES = 10;
const MAX_BACKOFF_SECONDS = 300;
const STALE_LOCK_MS = 60_000;
const POLL_INTERVAL_MS = 1000;
const BATCH_SIZE = 50;
export class AnalyticsOutboxWorker {
    db;
    producer;
    instanceId = randomUUID();
    timer = null;
    running = false;
    constructor(db, producer) {
        this.db = db;
        this.producer = producer;
    }
    async start() {
        if (this.producer.enabled === false || this.db === null) {
            logger.warn({
                database: this.db !== null,
                broker: this.producer.enabled,
            }, 'analytics_outbox_disabled: nothing to publish or no broker configured');
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
    async stop() {
        if (this.timer !== null) {
            clearInterval(this.timer);
            this.timer = null;
        }
        while (this.running) {
            await sleep(20);
        }
        logger.info('analytics_outbox_worker_stopped');
    }
    async runOnce() {
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
        }
        catch (error) {
            logger.error({ error: error instanceof Error ? error.message : String(error) }, 'analytics_outbox_batch_failed');
            return 0;
        }
        finally {
            this.running = false;
        }
    }
    async claim(db, limit) {
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
        const claimed = [];
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
    async publish(db, id) {
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
        const headers = {
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
            await this.producer.publishRaw(record.topic, JSON.stringify(envelope), record.id, headers);
        }
        catch (error) {
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
    async releaseWithFailure(db, attempts, id, error) {
        const message = (error instanceof Error ? error.message : String(error)).slice(0, 4000);
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
        logger.error({ eventId: id, attempts, deadLettered, error: message }, 'analytics_outbox_publish_failed');
    }
}
function sleep(milliseconds) {
    return new Promise((resolve) => {
        setTimeout(resolve, milliseconds).unref();
    });
}
