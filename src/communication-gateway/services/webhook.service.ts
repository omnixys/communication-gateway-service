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

import type { CommunicationProviderType } from '../domain/enums.js';
import { WebhookVerificationError } from '../domain/errors.js';
import type { InboundMessageReceived, MessageDelivered } from '../domain/events.js';
import type { DeliveryReceipt } from '../domain/models/delivery-receipt.model.js';
import type { InboundMessage } from '../domain/models/inbound-message.model.js';
import { assertValidTransition } from '../domain/services/delivery-lifecycle.service.js';
import type { ChannelProviderRegistry } from '../ports/channel-provider-registry.port.js';
import type { MessageMappingStore } from '../ports/message-mapping-store.port.js';
import type { OutboundEventPublisher } from '../ports/outbound-event-publisher.port.js';
const logger = getLogger('WebhookService', 'class');

/** Outcome of a processed webhook, as reported back to the caller. */
export type WebhookOutcome = 'INBOUND_MESSAGE' | 'DELIVERY_RECEIPT' | 'IGNORED';

/**
 * Verifies and interprets inbound provider webhooks.
 *
 * Inbound messages and delivery receipts are idempotent by provider message
 * id: a repeated webhook is acknowledged without emitting a second event.
 */
export class WebhookService {
  constructor(
    private readonly registry: ChannelProviderRegistry,
    private readonly publisher: OutboundEventPublisher,
    private readonly mappingStore: MessageMappingStore,
  ) {}

  async processWebhook(
    providerType: CommunicationProviderType,
    headers: Readonly<Record<string, string>>,
    body: Buffer,
  ): Promise<WebhookOutcome> {
    logger.info({ providerType }, 'webhook processing started');

    const provider = this.registry.getByProviderType(providerType);
    if (provider === null) {
      throw new WebhookVerificationError(providerType);
    }

    if (!(await provider.verifyWebhook(headers, body))) {
      throw new WebhookVerificationError(providerType);
    }

    const result = await provider.handleWebhook(headers, body);

    switch (result.kind) {
      case 'deliveryReceipt':
        await this.processReceipt(result.receipt);
        return 'DELIVERY_RECEIPT';
      case 'inboundMessage':
        await this.processInboundMessage(result.message);
        return 'INBOUND_MESSAGE';
      case 'ignored':
        return 'IGNORED';
    }
  }

  private async processInboundMessage(message: InboundMessage): Promise<void> {
    const existing = await this.mappingStore.findByProviderAndProviderMessageId(
      message.providerType,
      message.messageId,
    );

    // Idempotency is keyed on the provider message id alone. Re-processing a
    // mapping in any state - including PENDING and FAILED - would emit a
    // second InboundMessageReceived for a provider id that was already seen.
    if (existing !== null) {
      logger.info(
        {
          provider: message.providerType,
          messageId: message.messageId,
          status: existing.status,
        },
        'duplicate webhook skipped',
      );
      return;
    }

    const event: InboundMessageReceived = {
      kind: 'InboundMessageReceived',
      message,
    };
    await this.publisher.publish(event);
    logger.info(
      {
        provider: message.providerType,
        messageId: message.messageId,
      },
      'inbound message published',
    );
  }

  private async processReceipt(receipt: DeliveryReceipt): Promise<void> {
    const existing = await this.mappingStore.findByProviderAndProviderMessageId(
      receipt.providerType,
      receipt.providerMessageId,
    );

    if (existing !== null) {
      if (existing.status === receipt.status) {
        logger.info(
          {
            provider: receipt.providerType,
            providerMessageId: receipt.providerMessageId,
            status: receipt.status,
          },
          'duplicate delivery receipt skipped',
        );
        return;
      }
      assertValidTransition(existing.status, receipt.status);
      await this.mappingStore.updateStatus(
        receipt.providerMessageId,
        receipt.status,
        receipt.error,
      );
      logger.info(
        {
          provider: receipt.providerType,
          providerMessageId: receipt.providerMessageId,
          status: receipt.status,
        },
        'delivery status update applied',
      );
    }

    const event: MessageDelivered = { kind: 'MessageDelivered', receipt };
    await this.publisher.publish(event);
    logger.info(
      {
        provider: receipt.providerType,
        providerMessageId: receipt.providerMessageId,
      },
      'message delivered event published',
    );
  }
}
