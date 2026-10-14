import { PrismaModule } from '../prisma/prisma.module.js';
import { HealthController } from './health.controller.js';
import { Module } from '@nestjs/common';

@Module({ imports: [PrismaModule], controllers: [HealthController] })
export class HealthModule {}
