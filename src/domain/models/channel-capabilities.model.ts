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

/**
 * Feature set a channel offers, aggregated across the registered providers.
 *
 * Property names are part of the external GraphQL contract: the resolver
 * publishes every enabled key without the `supports_` prefix, for example
 * `attachments` or `read_receipts`. The snake_case spelling is therefore
 * intentional and must not be renamed to camelCase.
 */
export interface ChannelCapabilities {
  supports_attachments: boolean;
  supports_rich_text: boolean;
  supports_formatting: boolean;
  supports_typing: boolean;
  supports_read_receipts: boolean;
  supports_reactions: boolean;
  supports_quoted_replies: boolean;
  supports_forwarding: boolean;
  supports_editing: boolean;
  supports_deletion: boolean;
  supports_delivery_status: boolean;
  supports_presence: boolean;
  supports_templates: boolean;
  supports_bulk_messaging: boolean;
}

/** Capability set with every feature disabled. */
export const EMPTY_CHANNEL_CAPABILITIES: ChannelCapabilities = Object.freeze({
  supports_attachments: false,
  supports_rich_text: false,
  supports_formatting: false,
  supports_typing: false,
  supports_read_receipts: false,
  supports_reactions: false,
  supports_quoted_replies: false,
  supports_forwarding: false,
  supports_editing: false,
  supports_deletion: false,
  supports_delivery_status: false,
  supports_presence: false,
  supports_templates: false,
  supports_bulk_messaging: false,
});

/** Names of every capability flag, in declaration order. */
export const CHANNEL_CAPABILITY_KEYS = Object.keys(
  EMPTY_CHANNEL_CAPABILITIES,
) as ReadonlyArray<keyof ChannelCapabilities>;

/** Merges capability sets with a logical OR per feature. */
export function mergeChannelCapabilities(
  ...capabilitySets: readonly ChannelCapabilities[]
): ChannelCapabilities {
  const merged: ChannelCapabilities = { ...EMPTY_CHANNEL_CAPABILITIES };
  for (const capabilities of capabilitySets) {
    for (const key of CHANNEL_CAPABILITY_KEYS) {
      if (capabilities[key]) {
        merged[key] = true;
      }
    }
  }
  return merged;
}

/** Returns the enabled capability names without their `supports_` prefix. */
export function listCapabilityNames(
  capabilities: ChannelCapabilities,
): string[] {
  return CHANNEL_CAPABILITY_KEYS.filter((key) => capabilities[key]).map((key) =>
    key.slice('supports_'.length),
  );
}
