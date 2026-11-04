export class GatewayError extends Error {
    constructor(message) {
        super(message);
        this.name = new.target.name;
    }
}
export class ProviderNotFoundError extends GatewayError {
    providerType;
    constructor(providerType) {
        super(`No provider registered for type: ${providerType}`);
        this.providerType = providerType;
    }
}
export class ChannelNotFoundError extends GatewayError {
    channelType;
    constructor(channelType) {
        super(`No channel entry registered for: ${channelType}`);
        this.channelType = channelType;
    }
}
export class ProviderNotAvailableError extends GatewayError {
    providerType;
    constructor(providerType) {
        super(`Provider not available: ${providerType}`);
        this.providerType = providerType;
    }
}
export class DeliveryFailedError extends GatewayError {
    providerType;
    reason;
    constructor(providerType, reason) {
        super(`Delivery failed via ${providerType}: ${reason}`);
        this.providerType = providerType;
        this.reason = reason;
    }
}
export class WebhookVerificationError extends GatewayError {
    providerType;
    constructor(providerType) {
        super(`Webhook verification failed for provider: ${providerType}`);
        this.providerType = providerType;
    }
}
export class ConfigurationError extends GatewayError {
    issues;
    constructor(message, issues = []) {
        super(issues.length > 0 ? `${message}: ${issues.join('; ')}` : message);
        this.issues = issues;
    }
}
export class InvalidStatusTransitionError extends GatewayError {
    current;
    attempted;
    constructor(current, attempted) {
        super(`Invalid status transition: ${current} -> ${attempted}`);
        this.current = current;
        this.attempted = attempted;
    }
}
export class AddressResolutionError extends GatewayError {
    userId;
    channel;
    constructor(userId, channel, message) {
        super(message);
        this.userId = userId;
        this.channel = channel;
    }
}
export class NoProviderAvailableError extends GatewayError {
    channel;
    constructor(channel) {
        super(`No healthy providers available for channel: ${channel}`);
        this.channel = channel;
    }
}
