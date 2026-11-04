import { DeliveryStatus } from '../enums/gateway.enums.js';
export function createMessageMapping(seed) {
    return {
        sender: '',
        recipient: '',
        status: DeliveryStatus.PENDING,
        tenantId: '',
        organizationId: '',
        providerInstance: '',
        retryCount: 0,
        lastStatusChange: null,
        lastError: null,
        metadata: null,
        createdAt: new Date(),
        updatedAt: null,
        ...seed,
    };
}
