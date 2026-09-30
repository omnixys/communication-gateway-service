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
 * Injection tokens for the application services that are constructed from
 * their dependencies instead of being class instantiated by Nest.
 */
export const ADDRESS_RESOLVER = Symbol('ADDRESS_RESOLVER');
export const CHANNEL_PROVIDER_REGISTRY = Symbol('CHANNEL_PROVIDER_REGISTRY');
export const GATEWAY_DISPATCHER = Symbol('GATEWAY_DISPATCHER');
export const WEBHOOK_SERVICE = Symbol('WEBHOOK_SERVICE');
