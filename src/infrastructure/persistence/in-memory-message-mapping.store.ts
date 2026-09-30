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

import type { MessageMappingStore } from '../../application/ports/message-mapping-store.port.js';
import type { DeliveryStatus } from '../../domain/enums.js';
import type { MessageMapping } from '../../domain/models/message-mapping.model.js';

/**
 * Correlation store backed by an in-process map.
 *
 * Used when `DATABASE_URL` is empty. Every operation is synchronous, so the
 * behaviour of the local development run stays deterministic and the tests do
 * not need a database.
 */
export class InMemoryMessageMappingStore implements MessageMappingStore {
  private readonly byProviderMessageId = new Map<string, MessageMapping>();
  private readonly byInternalId = new Map<string, MessageMapping>();

  async save(mapping: MessageMapping): Promise<void> {
    this.byProviderMessageId.set(mapping.providerMessageId, { ...mapping });
    this.byInternalId.set(mapping.internalId, { ...mapping });
  }

  async getByProviderMessageId(
    providerMessageId: string,
  ): Promise<MessageMapping | null> {
    const mapping = this.byProviderMessageId.get(providerMessageId);
    return mapping === undefined ? null : { ...mapping };
  }

  async getByInternalId(internalId: string): Promise<MessageMapping | null> {
    const mapping = this.byInternalId.get(internalId);
    return mapping === undefined ? null : { ...mapping };
  }

  async findByProviderAndProviderMessageId(
    _provider: MessageMapping['provider'],
    providerMessageId: string,
  ): Promise<MessageMapping | null> {
    const mapping = this.byProviderMessageId.get(providerMessageId);
    if (mapping?.provider !== _provider) {
      return null;
    }
    return { ...mapping };
  }

  async updateStatus(
    providerMessageId: string,
    status: DeliveryStatus,
    error: string | null = null,
  ): Promise<void> {
    const mapping = this.byProviderMessageId.get(providerMessageId);
    if (mapping === undefined) {
      return;
    }
    mapping.status = status;
    mapping.lastStatusChange = new Date();
    mapping.lastError = error;
    mapping.updatedAt = new Date();
  }

  async incrementRetry(internalId: string): Promise<void> {
    const mapping = this.byInternalId.get(internalId);
    if (mapping === undefined) {
      return;
    }
    mapping.retryCount += 1;
    mapping.updatedAt = new Date();
  }

  async recordFailure(): Promise<void> {
    // The in-memory store keeps no delivery log; failures are surfaced through
    // the published events instead.
  }

  async health(): Promise<boolean> {
    return true;
  }
}
