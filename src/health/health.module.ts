import { AdapterModule } from '../adapter/adapter.module.js';
import { HealthController } from './health.controller.js';
import { Module } from '@nestjs/common';

@Module({ imports: [AdapterModule], controllers: [HealthController] })
export class HealthModule {}
