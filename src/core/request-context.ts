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

import { AsyncLocalStorage } from 'node:async_hooks';

/** Request scoped values propagated into every asynchronous operation. */
export interface RequestContext {
  readonly correlationId: string;
  readonly tenantId: string;
  readonly organizationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/** Runs a callback with the given context bound to the async execution. */
export function runWithRequestContext<T>(
  context: RequestContext,
  callback: () => T,
): T {
  return storage.run(context, callback);
}

/** Returns the active context, or `null` outside a request. */
export function currentRequestContext(): RequestContext | null {
  return storage.getStore() ?? null;
}

/** Returns the active correlation id, or `null` outside a request. */
export function currentCorrelationId(): string | null {
  return storage.getStore()?.correlationId ?? null;
}
