import type { PrismaClient } from '../prisma/generated/client.js';
import type { RawEventPublisher } from '../communication-gateway/models/interfaces/raw-event-publisher.port.js';
type Db = PrismaClient;
export declare class AnalyticsOutboxWorker {
    private readonly db;
    private readonly producer;
    private readonly instanceId;
    private timer;
    private running;
    constructor(db: Db | null, producer: RawEventPublisher);
    start(): Promise<void>;
    stop(): Promise<void>;
    runOnce(): Promise<number>;
    private claim;
    private publish;
    private releaseWithFailure;
}
export {};
