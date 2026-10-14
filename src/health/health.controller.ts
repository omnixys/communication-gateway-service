import { EVENT_FORWARDER } from '../adapter/events/events.module.js';
import type { HttpEventForwarder } from '../adapter/events/http-event.forwarder.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Public } from '../security/public.decorator.js';
import { Controller, Get, HttpStatus, Inject, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';

@Controller('health')
@Public()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EVENT_FORWARDER) private readonly forwarder: HttpEventForwarder,
  ) {}

  @Get()
  live(): { status: string } {
    return { status: 'ok' };
  }

  @Get('live')
  liveAlias(): { status: string } {
    return this.live();
  }

  @Get('liveness')
  liveness(): { status: string } {
    return this.live();
  }

  @Get('readiness')
  readiness(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ status: string; checks: Record<string, boolean> }> {
    return this.ready(reply);
  }

  @Get('ready')
  async ready(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<{ status: string; checks: Record<string, boolean> }> {
    let database = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = true;
    } catch {
      database = false;
    }
    const checks = {
      database,
      internalApiKey: (process.env.INTERNAL_API_KEY?.trim().length ?? 0) > 0,
      eventForwarder: this.forwarder.isReady,
    };
    const body = { status: Object.values(checks).every(Boolean) ? 'ready' : 'not_ready', checks };
    if (body.status !== 'ready') {
      reply.status(HttpStatus.SERVICE_UNAVAILABLE);
    }
    return body;
  }
}
