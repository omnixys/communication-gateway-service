import type { ProviderIdentity } from '../entities/provider-identity.model.js';
import type { ProviderIdentityResponse } from '../payloads/send-message.payload.js';

export function toIdentityResponse(
  identity: ProviderIdentity | null,
): ProviderIdentityResponse | null {
  if (identity === null) {
    return null;
  }
  return {
    name: identity.name,
    providerType: identity.providerType,
    version: identity.version,
    instance: identity.instance,
    apiVersion: identity.apiVersion,
  };
}
