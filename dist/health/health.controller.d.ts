import type { HttpEventForwarder } from '../adapter/events/http-event.forwarder.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { FastifyReply } from 'fastify';
export declare class HealthController {
    private readonly prisma;
    private readonly forwarder;
    constructor(prisma: PrismaService, forwarder: HttpEventForwarder);
    live(): {
        status: string;
    };
    liveAlias(): {
        status: string;
    };
    liveness(): {
        status: string;
    };
    readiness(reply: FastifyReply): Promise<{
        status: string;
        checks: Record<string, boolean>;
    }>;
    ready(reply: FastifyReply): Promise<{
        status: string;
        checks: Record<string, boolean>;
    }>;
}
