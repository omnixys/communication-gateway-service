import type { CommunicationProviderType } from '../enums/gateway.enums.js';
export interface ProviderIdentity {
    readonly name: string;
    readonly providerType: CommunicationProviderType;
    readonly version: string;
    readonly instance: string;
    readonly apiVersion: string;
}
