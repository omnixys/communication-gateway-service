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

import type { MessageMappingStore } from '../../application/ports/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../../application/ports/outbound-event-publisher.port.js';
import type {
  ForwarderConfig,
  WhatsappSupportRoute,
} from '../../config/config.types.js';
import type { GatewayEvent } from '../../domain/events.js';
import type {
  InboundMessageReceived,
  MessageDelivered,
} from '../../domain/events.js';
import { requestJson } from '../../shared/http-client.js';

const logger = getLogger('HttpEventForwarder', 'class');

/** Endpoints and credentials of the downstream services. */
export interface ForwarderTargets {
  readonly chatServiceUrl: string;
  readonly chatServiceApiKey: string;
  readonly notificationServiceUrl: string;
  readonly notificationServiceApiKey: string;
}

/**
 * Forwards gateway events to the chat and notification services.
 *
 * Retries use exponential backoff with jitter, because both services sit
 * behind the same platform network and a synchronized retry storm would be
 * worse than a single failed delivery.
 */
export class HttpEventForwarder {
  private readonly chatServiceUrl: string;
  private readonly notificationServiceUrl: string;
  private readonly whatsappSupportEventMap: Readonly<
    Record<string, WhatsappSupportRoute>
  >;
  private inboundTask: Promise<void> | null = null;
  private deliveryTask: Promise<void> | null = null;
  private ready = false;

  constructor(
    private readonly publisher: OutboundEventPublisher,
    private readonly targets: ForwarderTargets,
    private readonly mappingStore: MessageMappingStore,
    private readonly config: ForwarderConfig,
    whatsappSupportEventMap: Readonly<Record<string, WhatsappSupportRoute>>,
  ) {
    this.chatServiceUrl = targets.chatServiceUrl.replace(/\/+$/, '');
    this.notificationServiceUrl = targets.notificationServiceUrl.replace(
      /\/+$/,
      '',
    );
    this.whatsappSupportEventMap = whatsappSupportEventMap;
  }

  /** Whether the consumer loops are running. */
  get isReady(): boolean {
    return this.ready;
  }

  async start(): Promise<void> {
    // The subscriptions are taken before the consume loops start: a
    // subscription is only registered once the generator is first advanced, so
    // subscribing inside the loop would drop every event published between
    // start() and the first tick.
    const inbound = this.publisher.subscribe('InboundMessageReceived');
    const deliveries = this.publisher.subscribe('MessageDelivered');
    this.inboundTask = this.consumeInbound(inbound);
    this.deliveryTask = this.consumeDeliveries(deliveries);
    this.ready = true;
    logger.info(
      { chatServiceUrl: this.chatServiceUrl },
      'http_event_forwarder_started',
    );
  }

  async stop(): Promise<void> {
    this.ready = false;
    await this.publisher.close();
    await Promise.all([this.inboundTask, this.deliveryTask]);
    this.inboundTask = null;
    this.deliveryTask = null;
    logger.info('http_event_forwarder_stopped');
  }

  private async consumeInbound(
    stream: AsyncIterable<GatewayEvent>,
  ): Promise<void> {
    for await (const event of stream) {
      // close() ends the iteration once the queue is drained, so every
      // accepted event is still forwarded during shutdown.
      if (event.kind !== 'InboundMessageReceived') {
        continue;
      }
      try {
        await this.forwardInbound(event);
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : String(error) },
          'http_event_forwarder_inbound_error',
        );
      }
    }
  }

  private async consumeDeliveries(
    stream: AsyncIterable<GatewayEvent>,
  ): Promise<void> {
    for await (const event of stream) {
      // close() ends the iteration once the queue is drained, so every
      // accepted event is still forwarded during shutdown.
      if (event.kind !== 'MessageDelivered') {
        continue;
      }
      try {
        await this.forwardDelivery(event);
      } catch (error) {
        logger.error(
          { error: error instanceof Error ? error.message : String(error) },
          'http_event_forwarder_delivery_error',
        );
      }
    }
  }

  private async forwardInbound(event: InboundMessageReceived): Promise<void> {
    const { message } = event;
    const route =
      message.providerInstance === null
        ? undefined
        : this.whatsappSupportEventMap[message.providerInstance];

    if (route === undefined) {
      logger.warn(
        {
          provider: message.providerType,
          providerInstance: message.providerInstance,
          messageId: message.messageId,
        },
        'whatsapp_support_event_route_missing',
      );
      return;
    }

    const result = await this.postWithRetry(
      `${this.notificationServiceUrl}/internal/support/inbound-message`,
      {
        externalId: message.messageId,
        tenantId: route.tenantId,
        eventId: route.eventId,
        from: message.from,
        senderName: message.senderName,
        body: message.body,
        mediaUrl: message.attachment?.url ?? null,
        mimeType: message.attachment?.mimeType ?? null,
      },
      { 'x-internal-token': this.targets.notificationServiceApiKey },
    );

    if (result.ok) {
      logger.info(
        { messageId: message.messageId, channel: message.channel.type },
        'forward_inbound_support_success',
      );
      return;
    }
    logger.warn(
      {
        messageId: message.messageId,
        status: result.status,
        attempts: result.attempts,
      },
      'forward_inbound_support_failed',
    );
  }

  private async forwardDelivery(event: MessageDelivered): Promise<void> {
    const { receipt } = event;
    let internalMessageId = '';
    let conversationId = '';

    try {
      const mapping = await this.mappingStore.getByProviderMessageId(
        receipt.providerMessageId,
      );
      if (mapping !== null) {
        internalMessageId = mapping.internalId;
        conversationId = mapping.conversationId;
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

    const result = await this.postWithRetry(
      `${this.chatServiceUrl}/api/v1/internal/delivery-status`,
      {
        provider_message_id: receipt.providerMessageId,
        status: receipt.status,
        error: receipt.error,
        timestamp: receipt.timestamp.toISOString(),
        internal_message_id: internalMessageId,
        conversation_id: conversationId,
      },
      { 'x-api-key': this.targets.chatServiceApiKey },
    );

    if (result.ok) {
      logger.info(
        {
          providerMessageId: receipt.providerMessageId,
          status: receipt.status,
        },
        'forward_delivery_success',
      );
      return;
    }
    logger.warn(
      {
        providerMessageId: receipt.providerMessageId,
        status: result.status,
        attempts: result.attempts,
      },
      'forward_delivery_failed',
    );
  }

  /**
   * Posts a payload and retries on rejection or transport failure.
   *
   * @returns the last response together with the number of attempts spent.
   */
  private async postWithRetry(
    url: string,
    body: Readonly<Record<string, unknown>>,
    headers: Readonly<Record<string, string>>,
  ): Promise<{ ok: boolean; status: number; attempts: number }> {
    let attempt = 0;
    let status = 0;

    while (attempt < this.config.maxAttempts) {
      attempt += 1;
      try {
        const response = await requestJson({
          method: 'POST',
          url,
          timeoutMs: this.config.timeoutMs,
          headers,
          body,
        });
        status = response.status;
        if (response.ok) {
          return { ok: true, status, attempts: attempt };
        }
        if (!isRetryableStatus(response.status)) {
          return { ok: false, status, attempts: attempt };
        }
      } catch (error) {
        logger.warn(
          {
            url,
            attempt,
            error: error instanceof Error ? error.message : String(error),
          },
          'forward_attempt_failed',
        );
      }

      if (attempt < this.config.maxAttempts) {
        await delay(backoffDelay(attempt, this.config));
      }
    }

    return { ok: false, status, attempts: attempt };
  }
}

/** Server-side errors and throttling are worth another attempt. */
function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

/** Exponential backoff with full jitter, capped by the configured maximum. */
export function backoffDelay(attempt: number, config: ForwarderConfig): number {
  const exponential = Math.min(
    config.maxDelayMs,
    config.baseDelayMs * 2 ** (attempt - 1),
  );
  return Math.round(exponential * (0.5 + Math.random() * 0.5));
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds).unref();
  });
}
