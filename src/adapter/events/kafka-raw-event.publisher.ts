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

import type { KafkaProducerService } from '@omnixys/kafka-ts';
import { getLogger } from '@omnixys/logger-ts';

import type { RawEventPublisher } from '../../communication-gateway/models/interfaces/raw-event-publisher.port.js';
import { currentCorrelationId } from '../../core/request-context.js';

const logger = getLogger('KafkaRawEventPublisher', 'class');

/**
 * Publishes raw JSON payloads through the shared Kafka producer.
 *
 * The analytics outbox owns the envelope, so this publisher stays a thin
 * transport adapter and never re-serializes a payload.
 */
export class KafkaRawEventPublisher implements RawEventPublisher {
  constructor(private readonly producer: KafkaProducerService) {}

  get enabled(): boolean {
    return true;
  }

  async publishRaw(
    topic: string,
    value: string,
    key?: string,
    headers: Readonly<Record<string, string>> = {},
  ): Promise<void> {
    const correlationId = currentCorrelationId();
    try {
      await this.producer.rawSendWithHeaders(topic, value, {
        ...headers,
        ...(key === undefined ? {} : { 'x-key': key }),
        ...(correlationId === null
          ? {}
          : { 'x-correlation-id': correlationId }),
      });
    } catch (error) {
      logger.error(
        {
          topic,
          error: error instanceof Error ? error.message : String(error),
        },
        'kafka_publish_error',
      );
      throw error;
    }
    logger.debug({ topic, key }, 'kafka_raw_published');
  }

  async shutdown(): Promise<void> {
    await this.producer.close();
  }
}

/** Publisher used when no broker is configured, so the outbox stays a no-op. */
export class DisabledRawEventPublisher implements RawEventPublisher {
  get enabled(): boolean {
    return false;
  }

  async publishRaw(
    topic: string,
    _value: string,
    _key?: string,
    _headers?: Readonly<Record<string, string>>,
  ): Promise<void> {
    logger.debug({ topic }, 'raw event dropped, no broker configured');
  }

  async shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
