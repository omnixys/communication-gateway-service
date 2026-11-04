import type { ProviderIdentity } from './provider-identity.model.js';
export interface ProviderMetadata {
    readonly identity: ProviderIdentity;
    readonly supportsHealth: boolean;
    readonly supportsWebhooks: boolean;
    readonly supportsTemplates: boolean;
    readonly supportsDeliveryReceipts: boolean;
    readonly supportsReadReceipts: boolean;
    readonly supportsTyping: boolean;
}
