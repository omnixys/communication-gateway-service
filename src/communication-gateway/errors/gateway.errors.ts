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

import type {
  CommunicationChannelType,
  CommunicationProviderType,
} from '../models/enums/gateway.enums.js';

/** Base class for every expected domain failure. */
export class GatewayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** No adapter is registered for the requested provider type. */
export class ProviderNotFoundError extends GatewayError {
  constructor(public readonly providerType: CommunicationProviderType) {
    super(`No provider registered for type: ${providerType}`);
  }
}

/** No channel entry is registered for the requested channel. */
export class ChannelNotFoundError extends GatewayError {
  constructor(public readonly channelType: CommunicationChannelType) {
    super(`No channel entry registered for: ${channelType}`);
  }
}

/** A registered provider is currently disabled. */
export class ProviderNotAvailableError extends GatewayError {
  constructor(public readonly providerType: CommunicationProviderType) {
    super(`Provider not available: ${providerType}`);
  }
}

/** The provider rejected a delivery attempt. */
export class DeliveryFailedError extends GatewayError {
  constructor(
    public readonly providerType: CommunicationProviderType,
    public readonly reason: string,
  ) {
    super(`Delivery failed via ${providerType}: ${reason}`);
  }
}

/** A webhook payload could not be authenticated. */
export class WebhookVerificationError extends GatewayError {
  constructor(public readonly providerType: CommunicationProviderType) {
    super(`Webhook verification failed for provider: ${providerType}`);
  }
}

/** The runtime configuration is unusable. */
export class ConfigurationError extends GatewayError {
  public readonly issues: readonly string[];

  constructor(message: string, issues: readonly string[] = []) {
    super(issues.length > 0 ? `${message}: ${issues.join('; ')}` : message);
    this.issues = issues;
  }
}

/** A delivery status transition is not allowed by the lifecycle. */
export class InvalidStatusTransitionError extends GatewayError {
  constructor(
    public readonly current: string,
    public readonly attempted: string,
  ) {
    super(`Invalid status transition: ${current} -> ${attempted}`);
  }
}

/** A recipient address could not be resolved for a channel. */
export class AddressResolutionError extends GatewayError {
  constructor(
    public readonly userId: string,
    public readonly channel: CommunicationChannelType,
    message: string,
  ) {
    super(message);
  }
}

/** No healthy provider is available for a channel. */
export class NoProviderAvailableError extends GatewayError {
  constructor(public readonly channel: CommunicationChannelType) {
    super(`No healthy providers available for channel: ${channel}`);
  }
}
