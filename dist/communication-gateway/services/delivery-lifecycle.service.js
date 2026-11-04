import { getLogger } from '@omnixys/logger-ts';
import { InvalidStatusTransitionError } from '../errors/gateway.errors.js';
import { DeliveryStatus } from '../models/enums/gateway.enums.js';
const logger = getLogger('DeliveryLifecycle', 'domain');
const VALID_TRANSITIONS = {
    [DeliveryStatus.UNKNOWN]: new Set([DeliveryStatus.PENDING, DeliveryStatus.FAILED]),
    [DeliveryStatus.PENDING]: new Set([
        DeliveryStatus.QUEUED,
        DeliveryStatus.SENT,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    ]),
    [DeliveryStatus.QUEUED]: new Set([
        DeliveryStatus.SENT,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    ]),
    [DeliveryStatus.SENT]: new Set([
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    ]),
    [DeliveryStatus.DELIVERED]: new Set([
        DeliveryStatus.READ,
        DeliveryStatus.FAILED,
        DeliveryStatus.CANCELLED,
    ]),
    [DeliveryStatus.READ]: new Set([DeliveryStatus.FAILED, DeliveryStatus.CANCELLED]),
    [DeliveryStatus.FAILED]: new Set([DeliveryStatus.PENDING, DeliveryStatus.CANCELLED]),
    [DeliveryStatus.CANCELLED]: new Set(),
};
export function isValidTransition(current, next) {
    if (current === next) {
        return true;
    }
    return VALID_TRANSITIONS[current]?.has(next) ?? false;
}
export function assertValidTransition(current, next) {
    if (!isValidTransition(current, next)) {
        logger.warn({ currentStatus: current, attemptedStatus: next }, 'invalid status transition');
        throw new InvalidStatusTransitionError(current, next);
    }
}
