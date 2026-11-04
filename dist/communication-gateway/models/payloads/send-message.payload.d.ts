export interface ProviderIdentityResponse {
    readonly name: string;
    readonly providerType: string;
    readonly version: string;
    readonly instance: string | null;
    readonly apiVersion: string | null;
}
export interface SendMessageResult {
    readonly success: boolean;
    readonly providerMessageId: string | null;
    readonly status: string | null;
    readonly error: string | null;
    readonly providerIdentity: ProviderIdentityResponse | null;
}
