import type { ProviderIdentity } from '../entities/provider-identity.model.js';
import type { DeliveryStatus } from '../enums/gateway.enums.js';
export interface ProviderResponse {
    readonly success: boolean;
    readonly providerMessageId: string | null;
    readonly status: DeliveryStatus;
    readonly error: string | null;
    readonly raw: Record<string, unknown> | null;
    readonly providerIdentity: ProviderIdentity | null;
}
