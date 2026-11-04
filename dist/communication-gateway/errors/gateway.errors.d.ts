import type { CommunicationChannelType, CommunicationProviderType } from '../models/enums/gateway.enums.js';
export declare class GatewayError extends Error {
    constructor(message: string);
}
export declare class ProviderNotFoundError extends GatewayError {
    readonly providerType: CommunicationProviderType;
    constructor(providerType: CommunicationProviderType);
}
export declare class ChannelNotFoundError extends GatewayError {
    readonly channelType: CommunicationChannelType;
    constructor(channelType: CommunicationChannelType);
}
export declare class ProviderNotAvailableError extends GatewayError {
    readonly providerType: CommunicationProviderType;
    constructor(providerType: CommunicationProviderType);
}
export declare class DeliveryFailedError extends GatewayError {
    readonly providerType: CommunicationProviderType;
    readonly reason: string;
    constructor(providerType: CommunicationProviderType, reason: string);
}
export declare class WebhookVerificationError extends GatewayError {
    readonly providerType: CommunicationProviderType;
    constructor(providerType: CommunicationProviderType);
}
export declare class ConfigurationError extends GatewayError {
    readonly issues: readonly string[];
    constructor(message: string, issues?: readonly string[]);
}
export declare class InvalidStatusTransitionError extends GatewayError {
    readonly current: string;
    readonly attempted: string;
    constructor(current: string, attempted: string);
}
export declare class AddressResolutionError extends GatewayError {
    readonly userId: string;
    readonly channel: CommunicationChannelType;
    constructor(userId: string, channel: CommunicationChannelType, message: string);
}
export declare class NoProviderAvailableError extends GatewayError {
    readonly channel: CommunicationChannelType;
    constructor(channel: CommunicationChannelType);
}
