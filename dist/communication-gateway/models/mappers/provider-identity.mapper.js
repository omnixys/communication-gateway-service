export function toIdentityResponse(identity) {
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
