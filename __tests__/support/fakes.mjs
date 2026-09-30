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

/** Shared test doubles and model factories. */

import {
  CommunicationChannelType,
  CommunicationProviderType,
  DeliveryStatus,
  ProviderStatus,
} from '../../dist/domain/enums.js';

export const WHATSAPP_CHANNEL = Object.freeze({
  type: CommunicationChannelType.WHATSAPP,
});

export const EMAIL_CHANNEL = Object.freeze({
  type: CommunicationChannelType.EMAIL,
});

/** Builds a valid inbound message; every field can be overridden. */
export function inboundMessage(overrides = {}) {
  return {
    messageId: 'provider-message-1',
    channel: WHATSAPP_CHANNEL,
    providerType: CommunicationProviderType.EVOLUTION,
    from: '491700000000@c.us',
    body: 'hello',
    providerInstance: 'communication-gateway-test',
    senderName: 'Tester',
    contentType: 'TEXT',
    attachment: null,
    conversationId: '491700000000@c.us',
    receivedAt: new Date('2026-02-01T10:00:00.000Z'),
    ...overrides,
  };
}

/** Builds a valid delivery receipt. */
export function deliveryReceipt(overrides = {}) {
  return {
    messageId: 'provider-message-1',
    providerMessageId: 'provider-message-1',
    providerType: CommunicationProviderType.EVOLUTION,
    status: DeliveryStatus.DELIVERED,
    timestamp: new Date('2026-02-01T10:00:05.000Z'),
    error: null,
    ...overrides,
  };
}

/** Builds a message mapping as the persistence layer would store it. */
export function messageMapping(overrides = {}) {
  return {
    internalId: 'internal-1',
    providerMessageId: 'provider-message-1',
    provider: CommunicationProviderType.EVOLUTION,
    channel: CommunicationChannelType.WHATSAPP,
    conversationId: '491700000000@c.us',
    sender: '491700000000@c.us',
    recipient: '491700000001@c.us',
    status: DeliveryStatus.SENT,
    tenantId: '11111111-1111-4111-8111-111111111111',
    organizationId: '22222222-2222-4222-8222-222222222222',
    providerInstance: 'communication-gateway-test',
    retryCount: 0,
    lastStatusChange: new Date('2026-02-01T10:00:00.000Z'),
    lastError: null,
    metadata: null,
    createdAt: new Date('2026-02-01T09:59:00.000Z'),
    updatedAt: null,
    ...overrides,
  };
}

/** Records every event handed to it, for subscription and routing assertions. */
export class RecordingEventPublisher {
  constructor() {
    this.events = [];
    this.closed = false;
  }

  async publish(event) {
    this.events.push(event);
  }

  subscribe() {
    throw new Error('subscribe is not implemented by the test double');
  }

  async close() {
    this.closed = true;
  }

  of(kind) {
    return this.events.filter((event) => event.kind === kind);
  }

  clear() {
    this.events.length = 0;
  }
}

/** Raw publisher double for the Kafka facing port. */
export class RecordingRawPublisher {
  constructor({ enabled = true, failWith = null } = {}) {
    this.enabled = enabled;
    this.failWith = failWith;
    this.messages = [];
    this.shutdownCalls = 0;
  }

  async publishRaw(topic, value, key, headers) {
    if (this.failWith !== null) {
      throw this.failWith;
    }
    this.messages.push({ topic, value, key, headers });
  }

  async shutdown() {
    this.shutdownCalls += 1;
  }

  parsed() {
    return this.messages.map((message) => JSON.parse(message.value));
  }
}

/** Provider double with scriptable webhook results. */
export class FakeProvider {
  constructor(overrides = {}) {
    this.providerType = CommunicationProviderType.EVOLUTION;
    this.metadata = {
      identity: {
        name: 'fake',
        providerType: CommunicationProviderType.EVOLUTION,
        version: 'v1',
        instance: 'fake',
        apiVersion: 'v1',
      },
      supportsHealth: true,
      supportsWebhooks: true,
      supportsTemplates: false,
      supportsDeliveryReceipts: true,
      supportsReadReceipts: true,
      supportsTyping: true,
    };
    this.verifyResult = true;
    this.webhookResult = { kind: 'ignored' };
    this.verifyCalls = 0;
    this.handleCalls = 0;
    this.healthy = true;
    this.sent = [];
    this.closed = false;
    Object.assign(this, overrides);
  }

  async send(message) {
    this.sent.push(message);
    return {
      success: true,
      providerMessageId: `sent-${this.sent.length}`,
      status: DeliveryStatus.SENT,
      error: null,
      raw: null,
      providerIdentity: this.metadata.identity,
    };
  }

  async health() {
    return this.healthy;
  }

  async capabilities() {
    return {
      supports_attachments: false,
      supports_rich_text: false,
      supports_formatting: false,
      supports_typing: true,
      supports_read_receipts: true,
      supports_reactions: false,
      supports_quoted_replies: false,
      supports_forwarding: false,
      supports_editing: false,
      supports_deletion: false,
      supports_delivery_status: true,
      supports_presence: false,
      supports_templates: false,
      supports_bulk_messaging: false,
    };
  }

  async verifyWebhook() {
    this.verifyCalls += 1;
    return this.verifyResult;
  }

  async handleWebhook() {
    this.handleCalls += 1;
    return this.webhookResult;
  }

  async close() {
    this.closed = true;
  }
}

/** Registry double exposing a fixed set of providers. */
export class FakeRegistry {
  constructor(providers = []) {
    this.providers = new Map(
      providers.map((provider) => [provider.providerType, provider]),
    );
    this.enabled = new Map();
  }

  getByProviderType(providerType) {
    return this.providers.get(providerType) ?? null;
  }

  listProviders() {
    return [...this.providers.values()];
  }

  isProviderEnabled(providerType) {
    return this.enabled.get(providerType) ?? true;
  }

  enableProvider(providerType) {
    this.enabled.set(providerType, true);
  }

  disableProvider(providerType) {
    this.enabled.set(providerType, false);
  }

  getProviderMetadata(providerType) {
    return this.providers.get(providerType)?.metadata ?? null;
  }

  async getChannelCapabilities() {
    return new FakeProvider().capabilities();
  }
}

/** Minimal in-memory MessageMappingStore built on the shipped implementation. */
export async function inMemoryStore() {
  const { InMemoryMessageMappingStore } =
    await import('../../dist/infrastructure/persistence/in-memory-message-mapping.store.js');
  return new InMemoryMessageMappingStore();
}

export { CommunicationProviderType, DeliveryStatus, ProviderStatus };
