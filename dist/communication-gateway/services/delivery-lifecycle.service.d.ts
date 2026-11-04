import { DeliveryStatus } from '../models/enums/gateway.enums.js';
export declare function isValidTransition(current: DeliveryStatus, next: DeliveryStatus): boolean;
export declare function assertValidTransition(current: DeliveryStatus, next: DeliveryStatus): void;
