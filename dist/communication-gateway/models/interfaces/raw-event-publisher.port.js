import { DeliveryStatus } from '../enums/gateway.enums.js';
export const ANALYTICS_DELIVERY_SUCCEEDED_TOPIC = 'communication.delivery.succeeded.v1';
export const ANALYTICS_DELIVERY_FAILED_TOPIC = 'communication.delivery.failed.v1';
export const ANALYTICS_TERMINAL_STATUSES = new Set([
    DeliveryStatus.DELIVERED,
    DeliveryStatus.READ,
    DeliveryStatus.FAILED,
]);
