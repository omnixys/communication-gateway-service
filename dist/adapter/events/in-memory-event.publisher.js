import { getLogger } from '@omnixys/logger-ts';
const logger = getLogger('InMemoryEventPublisher', 'class');
export class InMemoryEventPublisher {
    subscribers = new Map();
    async publish(event) {
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
            }
            else {
                waiting({ done: false, value: event });
            }
        }
    }
    subscribe(kind) {
        const subscriber = { queue: [], waiting: null, closing: false };
        const subscribers = this.subscribers.get(kind) ?? new Set();
        subscribers.add(subscriber);
        this.subscribers.set(kind, subscribers);
        return this.iterate(kind, subscriber);
    }
    async close() {
        for (const subscribers of this.subscribers.values()) {
            for (const subscriber of subscribers) {
                subscriber.closing = true;
                if (subscriber.queue.length === 0) {
                    subscriber.waiting?.({ done: true, value: undefined });
                }
            }
        }
    }
    async *iterate(kind, subscriber) {
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
                const next = await new Promise((resolve) => {
                    subscriber.waiting = resolve;
                });
                if (next.done === true) {
                    return;
                }
                yield next.value;
            }
        }
        finally {
            this.remove(kind, subscriber);
        }
    }
    remove(kind, subscriber) {
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
