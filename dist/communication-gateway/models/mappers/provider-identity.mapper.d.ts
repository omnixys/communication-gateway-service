import type { ProviderIdentity } from '../entities/provider-identity.model.js';
import type { ProviderIdentityResponse } from '../payloads/send-message.payload.js';
export declare function toIdentityResponse(identity: ProviderIdentity | null): ProviderIdentityResponse | null;
