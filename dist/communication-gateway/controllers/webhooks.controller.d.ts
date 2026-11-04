import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { WebhookService } from '../services/webhook.service.js';
export interface WebhookAck {
    readonly received: boolean;
    readonly result: string | null;
}
export declare class WebhooksController {
    private readonly webhooks;
    constructor(webhooks: WebhookService);
    receive(raw: string, headers: Record<string, string>, request: RawBodyRequest<FastifyRequest>): Promise<WebhookAck>;
    challenge(): never;
}
