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

import { getLogger } from '@omnixys/logger-ts';

import type { MessageMappingStore } from '../../communication-gateway/models/interfaces/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../../communication-gateway/models/interfaces/outbound-event-publisher.port.js';
import type { RawEventPublisher } from '../../communication-gateway/models/interfaces/raw-event-publisher.port.js';
import type { GatewayEvent } from '../../communication-gateway/models/payloads/gateway-events.payload.js';
import type { MessageDelivered } from '../../communication-gateway/models/payloads/gateway-events.payload.js';

const logger = getLogger('KafkaDeliveryEventHandler', 'class');

/** Broker topic that carries delivery status changes. */
export const DELIVERY_STATUS_TOPIC = 'gateway.delivery.status';

/**
 * Mirrors delivery receipts onto the broker.
 *
 * The handler consumes the in-process bus instead of being called by the
 * webhook path, so a broker outage never delays an inbound webhook response.
 */
export class KafkaDeliveryEventHandler {
  private task: Promise<void> | null = null;

  constructor(
    private readonly publisher: OutboundEventPublisher,
    private readonly producer: RawEventPublisher,
    private readonly mappingStore: MessageMappingStore,
  ) {}

  async start(): Promise<void> {
    if (this.producer.enabled === false) {
      logger.info({ topic: DELIVERY_STATUS_TOPIC }, 'delivery_events_disabled');
      return;
    }
    // Subscribing before the loop starts guarantees that a receipt published
    // right after start() is queued instead of dropped.
    this.task = this.run(this.publisher.subscribe('MessageDelivered'));
    logger.info(
      { topic: DELIVERY_STATUS_TOPIC },
      'kafka_delivery_handler_started',
    );
  }

  async stop(): Promise<void> {
    await this.publisher.close();
    await this.task;
    this.task = null;
    await this.producer.shutdown();
    logger.info('kafka_delivery_handler_stopped');
  }

  private async run(stream: AsyncIterable<GatewayEvent>): Promise<void> {
    for await (const event of stream) {
      // close() ends the iteration once the queue is drained, so every
      // accepted event is still forwarded during shutdown.
      if (event.kind !== 'MessageDelivered') {
        continue;
      }
      try {
        await this.publish(event);
      } catch (error) {
        logger.error(
          {
            providerMessageId: event.receipt.providerMessageId,
            error: error instanceof Error ? error.message : String(error),
          },
          'kafka_delivery_publish_error',
        );
      }
    }
  }

  private async publish(event: MessageDelivered): Promise<void> {
    const { receipt } = event;
    let internalMessageId = '';
    let conversationId = '';
    let channel = 'WHATSAPP';

    try {
      const mapping = await this.mappingStore.getByProviderMessageId(
        receipt.providerMessageId,
      );
      if (mapping === null) {
        logger.debug(
          { providerMessageId: receipt.providerMessageId },
          'mapping_not_found',
        );
      } else {
        internalMessageId = mapping.internalId;
        conversationId = mapping.conversationId;
        channel = mapping.channel;
      }
    } catch (error) {
      logger.error(
        {
          providerMessageId: receipt.providerMessageId,
          error: error instanceof Error ? error.message : String(error),
        },
        'mapping_lookup_error',
      );
    }

    const payload = {
      messageId: internalMessageId,
      providerMessageId: receipt.providerMessageId,
      conversationId,
      channel,
      provider: receipt.providerType,
      status: receipt.status,
      timestamp: receipt.timestamp.toISOString(),
      error: receipt.error,
    };
    const key =
      internalMessageId.length > 0
        ? internalMessageId
        : receipt.providerMessageId;

    await this.producer.publishRaw(
      DELIVERY_STATUS_TOPIC,
      JSON.stringify(payload),
      key,
      { 'x-provider': receipt.providerType, 'x-status': receipt.status },
    );
    logger.info(
      {
        providerMessageId: receipt.providerMessageId,
        status: receipt.status,
        topic: DELIVERY_STATUS_TOPIC,
      },
      'kafka_delivery_published',
    );
  }
}
