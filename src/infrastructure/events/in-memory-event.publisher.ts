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

import type { OutboundEventPublisher } from '../../application/ports/outbound-event-publisher.port.js';
import type { GatewayEvent } from '../../domain/events.js';

const logger = getLogger('InMemoryEventPublisher', 'class');

/** One consumer registration on the bus. */
interface Subscriber {
  readonly queue: GatewayEvent[];
  waiting: ((value: IteratorResult<GatewayEvent>) => void) | null;
  /** No further event will be queued; the queue is still being drained. */
  closing: boolean;
}

/**
 * In-process publish/subscribe bus.
 *
 * Every subscriber owns its queue, so a slow consumer cannot block the others
 * and a failing consumer cannot lose the events of a different kind.
 */
export class InMemoryEventPublisher implements OutboundEventPublisher {
  private readonly subscribers = new Map<
    GatewayEvent['kind'],
    Set<Subscriber>
  >();

  async publish(event: GatewayEvent): Promise<void> {
    const subscribers = this.subscribers.get(event.kind);
    if (subscribers === undefined) {
      logger.debug({ kind: event.kind }, 'event has no subscriber');
      return;
    }
    for (const subscriber of [...subscribers]) {
      if (subscriber.closing) {
        continue;
      }
      const waiting = subscriber.waiting;
      subscriber.waiting = null;
      if (waiting === null) {
        subscriber.queue.push(event);
      } else {
        waiting({ done: false, value: event });
      }
    }
  }

  subscribe(kind: GatewayEvent['kind']): AsyncGenerator<GatewayEvent> {
    const subscriber: Subscriber = { queue: [], waiting: null, closing: false };
    const subscribers = this.subscribers.get(kind) ?? new Set<Subscriber>();
    subscribers.add(subscriber);
    this.subscribers.set(kind, subscribers);

    return this.iterate(kind, subscriber);
  }

  /**
   * Closes the bus after the queued events have been handed out.
   *
   * A consumer that is asked to stop while an event is still queued must get
   * that event: a gateway shutdown happens right after the last webhook, and
   * dropping the queue would lose the forwarded message without a trace.
   */
  async close(): Promise<void> {
    for (const subscribers of this.subscribers.values()) {
      for (const subscriber of subscribers) {
        subscriber.closing = true;
        if (subscriber.queue.length === 0) {
          subscriber.waiting?.({ done: true, value: undefined });
        }
      }
    }
  }

  private async *iterate(
    kind: GatewayEvent['kind'],
    subscriber: Subscriber,
  ): AsyncGenerator<GatewayEvent> {
    try {
      for (;;) {
        const queued = subscriber.queue.shift();
        if (queued !== undefined) {
          yield queued;
          continue;
        }
        if (subscriber.closing) {
          return;
        }
        const next = await new Promise<IteratorResult<GatewayEvent>>(
          (resolve) => {
            subscriber.waiting = resolve;
          },
        );
        if (next.done === true) {
          return;
        }
        yield next.value;
      }
    } finally {
      this.remove(kind, subscriber);
    }
  }

  private remove(kind: GatewayEvent['kind'], subscriber: Subscriber): void {
    const subscribers = this.subscribers.get(kind);
    if (subscribers === undefined) {
      return;
    }
    subscribers.delete(subscriber);
    if (subscribers.size === 0) {
      this.subscribers.delete(kind);
    }
  }
}
