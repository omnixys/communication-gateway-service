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

import './../support/env.mjs';

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ChannelNotFoundError,
  ConfigurationError,
  GatewayError,
  InvalidStatusTransitionError,
  ProviderNotAvailableError,
  ProviderNotFoundError,
  WebhookVerificationError,
} from '../../dist/communication-gateway/errors/gateway.errors.js';
import {
  EMPTY_CHANNEL_CAPABILITIES,
  mergeChannelCapabilities,
} from '../../dist/communication-gateway/models/entities/channel-capabilities.model.js';
import { createMessageMapping } from '../../dist/communication-gateway/models/entities/message-mapping.model.js';
import {
  CommunicationChannelType,
  CommunicationProviderType,
  DeliveryStatus,
  parseCommunicationChannelType,
  parseCommunicationProviderType,
  parseContentType,
  parseDeliveryStatus,
} from '../../dist/communication-gateway/models/enums/gateway.enums.js';
import {
  assertValidTransition,
  isValidTransition,
} from '../../dist/communication-gateway/services/delivery-lifecycle.service.js';

describe('parseCommunicationProviderType', () => {
  it('accepts the three shipped adapters regardless of case', () => {
    assert.equal(
      parseCommunicationProviderType('evolution'),
      CommunicationProviderType.EVOLUTION,
    );
    assert.equal(
      parseCommunicationProviderType('RESEND'),
      CommunicationProviderType.RESEND,
    );
    assert.equal(
      parseCommunicationProviderType(' Stalwart '),
      CommunicationProviderType.STALWART,
    );
  });

  it('rejects a provider that this gateway does not ship', () => {
    assert.throws(() => parseCommunicationProviderType('twilio'), RangeError);
  });
});

describe('parseCommunicationChannelType', () => {
  it('narrows every documented channel', () => {
    for (const [value, expected] of [
      ['whatsapp', CommunicationChannelType.WHATSAPP],
      ['email', CommunicationChannelType.EMAIL],
      ['sms', CommunicationChannelType.SMS],
      ['push', CommunicationChannelType.PUSH],
    ]) {
      assert.equal(parseCommunicationChannelType(value), expected);
    }
  });

  it('rejects an unknown channel', () => {
    assert.throws(
      () => parseCommunicationChannelType('carrier-pigeon'),
      RangeError,
    );
  });
});

describe('parseDeliveryStatus and parseContentType', () => {
  it('narrows the documented statuses', () => {
    assert.equal(parseDeliveryStatus('delivered'), DeliveryStatus.DELIVERED);
    assert.equal(parseDeliveryStatus('READ'), DeliveryStatus.READ);
    assert.equal(parseDeliveryStatus('failed'), DeliveryStatus.FAILED);
  });

  it('rejects a status that the lifecycle does not know', () => {
    assert.throws(() => parseDeliveryStatus('bounced'), RangeError);
  });

  it('narrows the content encodings', () => {
    assert.equal(parseContentType('text'), 'TEXT');
    assert.equal(parseContentType('HTML'), 'HTML');
  });

  it('degrades an unknown content encoding to plain text', () => {
    assert.equal(parseContentType('markdown'), 'TEXT');
    assert.equal(parseContentType(''), 'TEXT');
  });
});

describe('delivery lifecycle', () => {
  it('allows the documented forward path', () => {
    assert.equal(
      isValidTransition(DeliveryStatus.PENDING, DeliveryStatus.SENT),
      true,
    );
    assert.equal(
      isValidTransition(DeliveryStatus.SENT, DeliveryStatus.DELIVERED),
      true,
    );
    assert.equal(
      isValidTransition(DeliveryStatus.DELIVERED, DeliveryStatus.READ),
      true,
    );
  });

  it('allows a send to fail and a message to be cancelled', () => {
    assert.equal(
      isValidTransition(DeliveryStatus.SENT, DeliveryStatus.FAILED),
      true,
    );
    assert.equal(
      isValidTransition(DeliveryStatus.PENDING, DeliveryStatus.CANCELLED),
      true,
    );
  });

  it('refuses to walk a delivery backwards', () => {
    assert.equal(
      isValidTransition(DeliveryStatus.DELIVERED, DeliveryStatus.PENDING),
      false,
    );
    assert.equal(
      isValidTransition(DeliveryStatus.READ, DeliveryStatus.SENT),
      false,
    );
    assert.equal(
      isValidTransition(DeliveryStatus.READ, DeliveryStatus.PENDING),
      false,
    );
  });

  it('refuses to revive a cancelled delivery', () => {
    assert.equal(
      isValidTransition(DeliveryStatus.CANCELLED, DeliveryStatus.SENT),
      false,
    );
  });

  it('allows a failed delivery to be retried', () => {
    assert.equal(
      isValidTransition(DeliveryStatus.FAILED, DeliveryStatus.PENDING),
      true,
    );
  });

  it('treats a repeated status as a no-op transition', () => {
    assert.equal(
      isValidTransition(DeliveryStatus.SENT, DeliveryStatus.SENT),
      true,
    );
  });

  it('reports an invalid transition as a domain error', () => {
    assert.throws(
      () => assertValidTransition(DeliveryStatus.READ, DeliveryStatus.PENDING),
      InvalidStatusTransitionError,
    );
    assert.doesNotThrow(() =>
      assertValidTransition(DeliveryStatus.SENT, DeliveryStatus.DELIVERED),
    );
  });
});

describe('channel capabilities', () => {
  it('merges a partial capability set onto the empty baseline', () => {
    const merged = mergeChannelCapabilities(EMPTY_CHANNEL_CAPABILITIES, {
      supports_typing: true,
      supports_delivery_status: true,
    });

    assert.equal(merged.supports_typing, true);
    assert.equal(merged.supports_delivery_status, true);
    assert.equal(merged.supports_attachments, false);
  });

  it('keeps the baseline immutable', () => {
    mergeChannelCapabilities(EMPTY_CHANNEL_CAPABILITIES, {
      supports_typing: true,
    });

    assert.equal(EMPTY_CHANNEL_CAPABILITIES.supports_typing, false);
  });
});

describe('createMessageMapping', () => {
  it('seeds a pending mapping with the correlation fields filled in', () => {
    const mapping = createMessageMapping({
      internalId: 'internal-1',
      providerMessageId: 'provider-1',
      provider: CommunicationProviderType.EVOLUTION,
      channel: CommunicationChannelType.WHATSAPP,
      conversationId: '491700000000@c.us',
      sender: '491700000000@c.us',
      recipient: '491700000001@c.us',
      tenantId: '11111111-1111-4111-8111-111111111111',
      organizationId: '22222222-2222-4222-8222-222222222222',
      providerInstance: 'omnixys',
    });

    assert.equal(mapping.status, DeliveryStatus.PENDING);
    assert.equal(mapping.retryCount, 0);
    assert.equal(mapping.lastError, null);
    assert.equal(mapping.metadata, null);
    assert.equal(mapping.lastStatusChange, null);
    assert.ok(mapping.createdAt instanceof Date);
  });
});

describe('domain errors', () => {
  it('keeps every expected failure on the gateway error hierarchy', () => {
    for (const error of [
      new ProviderNotFoundError(CommunicationProviderType.RESEND),
      new ChannelNotFoundError(CommunicationChannelType.SMS),
      new ProviderNotAvailableError(CommunicationProviderType.EVOLUTION),
      new WebhookVerificationError(CommunicationProviderType.EVOLUTION),
      new ConfigurationError('bad', ['A', 'B']),
    ]) {
      assert.ok(error instanceof GatewayError);
      assert.ok(error instanceof Error);
    }
  });

  it('names the failure after its own class so the API filter can classify it', () => {
    assert.equal(
      new WebhookVerificationError('EVOLUTION').name,
      'WebhookVerificationError',
    );
    assert.equal(
      new ProviderNotFoundError('RESEND').name,
      'ProviderNotFoundError',
    );
  });

  it('keeps the offending provider in the message without leaking internals', () => {
    const error = new ProviderNotFoundError(CommunicationProviderType.RESEND);

    assert.equal(error.providerType, CommunicationProviderType.RESEND);
    assert.match(error.message, /RESEND/u);
  });

  it('reports every configuration issue at once', () => {
    const error = new ConfigurationError('Invalid environment configuration', [
      'PORT must be an integer',
      'KAFKA_BROKER must be a string',
    ]);

    assert.deepEqual(error.issues, [
      'PORT must be an integer',
      'KAFKA_BROKER must be a string',
    ]);
    assert.match(error.message, /PORT must be an integer/u);
    assert.match(error.message, /KAFKA_BROKER must be a string/u);
  });

  it('stays free of a stack sensitive payload', () => {
    const error = new WebhookVerificationError('EVOLUTION');

    assert.equal(error.stack === undefined, false);
    assert.equal('apiKey' in error, false);
  });
});
